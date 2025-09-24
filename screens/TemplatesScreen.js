import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getWord } from '../i18n';
import {
  getAllTemplates,
  getCurrentTemplateId,
  setCurrentTemplateId,
  createTemplate,
  deleteTemplate,
  addOption,
  updateOption,
  toggleOptionEnabled,
  deleteOption,
  renameTemplate,
  setClearResultFlag,
} from '../storage/templates';

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState([]);
  const [currentId, setCurrentId] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionType, setNewOptionType] = useState('text'); // 'text' or 'subtemplate'
  const [newSubTemplateId, setNewSubTemplateId] = useState('');
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');

  async function refresh() {
    const [all, current] = await Promise.all([getAllTemplates(), getCurrentTemplateId()]);
    setTemplates(all);
    // 總是使用實際的當前模板ID，確保與Home頁面同步
    setCurrentId(current || (all[0]?.id || ''));
  }

  useEffect(() => {
    refresh();
  }, []);

  // 當屏幕獲得焦點時刷新數據（確保與Home頁面的轉盤同步）
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  async function onCreateTemplate() {
    if (!newTemplateName.trim()) return;
    await createTemplate(newTemplateName.trim());
    setNewTemplateName('');
    await refresh();
  }

  async function onDeleteTemplate(id) {
    await deleteTemplate(id);
    await refresh();
  }

  async function onSelectTemplate(id) {
    await setCurrentTemplateId(id);
    setCurrentId(id);
    await setClearResultFlag(); // 設置清空抽籤結果的標記
    await refresh();
  }

  async function onAddOption() {
    if (!currentId) return;
    
    let optionLabel = '';
    let subTemplateId = '';
    
    if (newOptionType === 'subtemplate') {
      if (!newSubTemplateId) {
        Alert.alert(getWord('Error'), getWord('Please select a sub-template'));
        return;
      }
      // 自動使用子模板的名字作為選項名字
      const subTemplate = templates.find(t => t.id === newSubTemplateId);
      if (subTemplate) {
        optionLabel = subTemplate.name;
        subTemplateId = newSubTemplateId;
      } else {
        Alert.alert(getWord('Error'), getWord('Sub-template not found'));
        return;
      }
    } else {
      if (!newOptionLabel.trim()) {
        Alert.alert(getWord('Error'), getWord('Please enter option label'));
        return;
      }
      optionLabel = newOptionLabel.trim();
    }
    
    await addOption(currentId, optionLabel, newOptionType, subTemplateId);
    setNewOptionLabel('');
    setNewOptionType('text');
    setNewSubTemplateId('');
    await refresh();
  }

  function currentTemplate() {
    return templates.find(t => t.id === currentId) || templates[0];
  }

  async function onToggleOption(optionId, enabled) {
    await toggleOptionEnabled(currentId, optionId, enabled);
    await refresh();
  }

  async function onDeleteOption(optionId) {
    await deleteOption(currentId, optionId);
    await refresh();
  }

  async function onRenameTemplate(name) {
    if (!currentId) return;
    await renameTemplate(currentId, name);
    await refresh();
  }

  // 開始編輯選項（使用 dialog）
  function startEditingOption(option) {
    setEditingOptionId(option.id);
    setEditingText(option.label);
  }

  // 取消編輯
  function cancelEditing() {
    setEditingOptionId(null);
    setEditingText('');
  }

  // 保存編輯
  async function saveEditingOption() {
    if (!editingOptionId || !editingText.trim()) {
      cancelEditing();
      return;
    }
    
    await updateOption(currentId, editingOptionId, { label: editingText.trim() });
    await refresh();
    cancelEditing();
  }

  // 開始編輯模板名稱
  function startEditingTemplate(template) {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
  }

  // 取消編輯模板名稱
  function cancelEditingTemplate() {
    setEditingTemplateId(null);
    setEditingTemplateName('');
  }

  // 保存編輯模板名稱
  async function saveEditingTemplate() {
    if (!editingTemplateId || !editingTemplateName.trim()) {
      cancelEditingTemplate();
      return;
    }
    
    await renameTemplate(editingTemplateId, editingTemplateName.trim());
    await refresh();
    cancelEditingTemplate();
  }

  const tpl = currentTemplate();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>{getWord('Templates')}</Text>
        <TouchableOpacity onPress={() => tpl && onDeleteTemplate(tpl.id)} style={styles.deleteTplBtn}>
          <Text style={styles.deleteTplText}>{getWord('Delete')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectRow}>
        <FlatList
          horizontal
          data={templates}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => onSelectTemplate(item.id)} 
              onLongPress={() => startEditingTemplate(item)}
              style={[styles.tplChip, item.id === currentId && styles.tplChipActive]}
            >
              <Text style={styles.tplChipText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {tpl && (
        <View style={styles.renameRow}>
          <TextInput value={tpl.name} onChangeText={onRenameTemplate} style={styles.input} />
        </View>
      )}

      <View style={styles.createRow}>
        <TextInput value={newTemplateName} onChangeText={setNewTemplateName} placeholder={getWord('New template name')} style={styles.input} />
        <TouchableOpacity onPress={onCreateTemplate} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{getWord('Create')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.optionsHeaderRow}>
        <Text style={styles.subHeader}>{getWord('Options')}</Text>
      </View>

      <FlatList
        data={tpl?.options || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.optionRow}>
            <TouchableOpacity
              onLongPress={() => startEditingOption(item)}
              style={styles.optionLabelContainer}
            >
              <Text 
                style={[
                  styles.optionLabel, 
                  item.enabled === false && styles.optionDisabled,
                  item.enabled !== false && styles.optionEnabled
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.type === 'subtemplate' ? '⭐ ' : ''}{item.label}
              </Text>
            </TouchableOpacity>
            <View style={styles.optionActions}>
              <TouchableOpacity onPress={() => onToggleOption(item.id, !(item.enabled !== false))} style={styles.secondaryBtn}>
                <Text>{item.enabled !== false ? getWord('Disable') : getWord('Enable')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDeleteOption(item.id)} style={styles.dangerBtn}>
                <Text style={styles.dangerText}>{getWord('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.addRow}>
        {newOptionType === 'text' ? (
          <TextInput value={newOptionLabel} onChangeText={setNewOptionLabel} placeholder={getWord('New option label')} style={styles.input} />
        ) : (
          <View style={styles.subTemplateInfo}>
            <Text style={styles.subTemplateInfoText}>
              {newSubTemplateId ? 
                `${getWord('Will use name')}: "${templates.find(t => t.id === newSubTemplateId)?.name || ''}"` : 
                getWord('Select a sub-template above')
              }
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={onAddOption} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{getWord('Add')}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.optionTypeRow}>
        <Text style={styles.optionTypeLabel}>{getWord('Option Type')}:</Text>
        <TouchableOpacity 
          onPress={() => setNewOptionType('text')} 
          style={[styles.typeButton, newOptionType === 'text' && styles.typeButtonActive]}
        >
          <Text style={[styles.typeButtonText, newOptionType === 'text' && styles.typeButtonTextActive]}>
            {getWord('Text')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setNewOptionType('subtemplate')} 
          style={[styles.typeButton, newOptionType === 'subtemplate' && styles.typeButtonActive]}
        >
          <Text style={[styles.typeButtonText, newOptionType === 'subtemplate' && styles.typeButtonTextActive]}>
            ⭐ {getWord('Sub-Template')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {newOptionType === 'subtemplate' && (
        <View style={styles.subTemplateRow}>
          <Text style={styles.subTemplateLabel}>{getWord('Select Sub-Template')}:</Text>
          <View style={styles.subTemplateList}>
            {templates.filter(t => t.id !== currentId).map(template => (
              <TouchableOpacity
                key={template.id}
                onPress={() => setNewSubTemplateId(template.id)}
                style={[styles.subTemplateOption, newSubTemplateId === template.id && styles.subTemplateOptionActive]}
              >
                <Text style={[styles.subTemplateOptionText, newSubTemplateId === template.id && styles.subTemplateOptionTextActive]}>
                  {template.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 編輯選項的 Modal Dialog */}
      <Modal
        visible={editingOptionId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelEditing}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{getWord('Edit Option')}</Text>
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              style={styles.modalInput}
              placeholder={getWord('Enter option text')}
              autoFocus
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={cancelEditing} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>{getWord('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEditingOption} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>{getWord('Save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 編輯模板名稱的 Modal Dialog */}
      <Modal
        visible={editingTemplateId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelEditingTemplate}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{getWord('Edit Template Name')}</Text>
            <TextInput
              value={editingTemplateName}
              onChangeText={setEditingTemplateName}
              style={styles.modalInput}
              placeholder={getWord('Enter template name')}
              autoFocus
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={cancelEditingTemplate} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>{getWord('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEditingTemplate} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>{getWord('Save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteTplBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffe5e5',
    borderRadius: 6,
  },
  deleteTplText: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  selectRow: {
    marginTop: 12,
  },
  tplChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 18,
    marginRight: 8,
  },
  tplChipActive: {
    backgroundColor: '#c5e1a5',
  },
  tplChipText: {
    fontSize: 14,
  },
  renameRow: {
    marginTop: 12,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  optionsHeaderRow: {
    marginTop: 16,
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  optionDisabled: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  optionEnabled: {
    color: '#4caf50',
    fontWeight: '600',
  },
  optionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  optionLabelContainer: {
    flex: 1,
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1976d2',
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginRight: 8,
  },
  dangerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffcdd2',
    borderRadius: 6,
  },
  dangerText: {
    color: '#b71c1c',
    fontWeight: 'bold',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  subTemplateInfo: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  subTemplateInfoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  optionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  optionTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: '#1976d2',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#333',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subTemplateRow: {
    marginTop: 12,
  },
  subTemplateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subTemplateList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  subTemplateOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  subTemplateOptionActive: {
    backgroundColor: '#c5e1a5',
    borderColor: '#4caf50',
  },
  subTemplateOptionText: {
    fontSize: 12,
    color: '#333',
  },
  subTemplateOptionTextActive: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  // Modal Dialog 樣式
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
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
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


