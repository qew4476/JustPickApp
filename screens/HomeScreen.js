import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
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

  async function refresh() {
    const [tpl, hide] = await Promise.all([
      getCurrentTemplate(),
      getHidePickedEnabled(),
    ]);
    setTemplate(tpl);
    setHidePicked(hide);
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

  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        {lastResult ? (
          <Text style={styles.result}>{lastResult.label}</Text>
        ) : (
          <Text style={styles.resultPlaceholder}>{getWord('Spin to see result')}</Text>
        )}
      </View>
      <Wheel options={optionsForWheel} onResult={onResult} />
      <View style={styles.bottomRow}>
        <View style={styles.rowLeft}>
          <Switch value={hidePicked} onValueChange={onToggleHidePicked} />
          <Text style={styles.rowLabel}>{getWord('Hide Picked Item')}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefreshHidden}>
          <Text style={styles.refreshText}>{getWord('Refresh')}</Text>
        </TouchableOpacity>
      </View>
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
});


