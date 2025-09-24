import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Wheel from '../components/Wheel';
import { getWord } from '../i18n';
import {
  getCurrentTemplate,
  getHidePickedEnabled,
  setHidePickedEnabled,
  setHiddenOption,
  clearHiddenOptions,
  getAllTemplates,
  setCurrentTemplateId,
} from '../storage/templates';

export default function HomeScreen() {
  const [template, setTemplate] = useState(null);
  const [hidePicked, setHidePicked] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  async function refresh() {
    const [tpl, hide, allTemplates] = await Promise.all([
      getCurrentTemplate(),
      getHidePickedEnabled(),
      getAllTemplates(),
    ]);
    setTemplate(tpl);
    setHidePicked(hide);
    setTemplates(allTemplates);
  }

  useEffect(() => {
    refresh();
  }, []);

  // 當屏幕獲得焦點時刷新數據（例如從 Templates 頁面返回時）
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const optionsForWheel = useMemo(() => {
    if (!template) return [];
    const hiddenSet = new Set(template.hiddenOptionIds || []);
    return (template.options || []).filter(o => o.enabled !== false && (!hidePicked || !hiddenSet.has(o.id)));
  }, [template, hidePicked]);

  // 創建一個唯一的 key 來強制重新渲染圓盤組件
  const wheelKey = useMemo(() => {
    if (!template) return 'empty';
    const enabledCount = (template.options || []).filter(o => o.enabled !== false).length;
    const hiddenCount = template.hiddenOptionIds?.length || 0;
    return `${template.id}-${enabledCount}-${hiddenCount}-${hidePicked}`;
  }, [template, hidePicked]);

  const onResult = useCallback(async (opt) => {
    setLastResult(opt);
    if (!template) return;
    
    // 如果是子模板選項，詢問是否切換到子轉盤
    if (opt.type === 'subtemplate') {
      const subTemplate = (await getAllTemplates()).find(t => t.id === opt.subTemplateId);
      if (subTemplate) {
        Alert.alert(
          getWord('Switch to Sub-Template'),
          `${getWord('Switch to')} "${subTemplate.name}"?`,
          [
            { text: getWord('Cancel'), style: 'cancel' },
            {
              text: getWord('Go'),
              onPress: async () => {
                await setCurrentTemplateId(opt.subTemplateId);
                // 刷新當前模板數據，但不跳轉頁面
                const newTemplate = await getCurrentTemplate();
                setTemplate(newTemplate);
                setLastResult(null); // 清空結果，因為切換了模板
              }
            }
          ]
        );
      }
    }
    
    if (hidePicked) {
      await setHiddenOption(template.id, opt.id, true);
      const tpl = await getCurrentTemplate();
      setTemplate(tpl);
    }
  }, [template, hidePicked]);

  async function onToggleHidePicked(value) {
    setHidePicked(value);
    await setHidePickedEnabled(value);
  }

  async function onRefreshHidden() {
    if (!template) return;
    await clearHiddenOptions(template.id);
    const tpl = await getCurrentTemplate();
    setTemplate(tpl);
  }

  async function onSelectTemplate(templateId) {
    await setCurrentTemplateId(templateId);
    const tpl = await getCurrentTemplate();
    setTemplate(tpl);
    setShowTemplateDropdown(false);
    setLastResult(null); // 清空結果，因為切換了模板
  }

  return (
    <View style={styles.container}>
      {/* 模板選擇 Dropdown */}
      <View style={styles.templateSelector}>
        <TouchableOpacity 
          onPress={() => setShowTemplateDropdown(true)}
          style={styles.templateButton}
        >
          <Text style={styles.templateButtonText}>
            {template ? template.name : getWord('Select Template')}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultContainer}>
        {lastResult ? (
          <Text style={styles.result}>{lastResult.label}</Text>
        ) : (
          <Text style={styles.resultPlaceholder}>{getWord('Spin to see result')}</Text>
        )}
      </View>
      <Wheel key={wheelKey} options={optionsForWheel} onResult={onResult} />
      <View style={styles.bottomRow}>
        <View style={styles.rowLeft}>
          <Switch value={hidePicked} onValueChange={onToggleHidePicked} />
          <Text style={styles.rowLabel}>{getWord('Hide Picked Item')}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefreshHidden}>
          <Text style={styles.refreshText}>{getWord('Refresh')}</Text>
        </TouchableOpacity>
      </View>

      {/* 模板選擇 Modal */}
      <Modal
        visible={showTemplateDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTemplateDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTemplateDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{getWord('Select Template')}</Text>
            <FlatList
              data={templates}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelectTemplate(item.id)}
                  style={[
                    styles.templateOption,
                    template && template.id === item.id && styles.templateOptionActive
                  ]}
                >
                  <Text style={[
                    styles.templateOptionText,
                    template && template.id === item.id && styles.templateOptionTextActive
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              onPress={() => setShowTemplateDropdown(false)} 
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelText}>{getWord('Cancel')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 60,
    justifyContent: 'center',
  },
  result: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1976d2',
  },
  resultPlaceholder: {
    fontSize: 20,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  bottomRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    marginLeft: 8,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#009688',
    borderRadius: 6,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // 模板選擇器樣式
  templateSelector: {
    marginBottom: 16,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  templateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  // Modal 樣式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  templateOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  templateOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  templateOptionText: {
    fontSize: 16,
    color: '#333',
  },
  templateOptionTextActive: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


