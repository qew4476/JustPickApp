import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  templates: 'jp.templates',
  currentTemplateId: 'jp.currentTemplateId',
  hidePickedEnabled: 'jp.hidePickedEnabled',
};

function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export async function getAllTemplates() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.templates);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAllTemplates(templates) {
  await AsyncStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
}

export async function getCurrentTemplateId() {
  return (await AsyncStorage.getItem(STORAGE_KEYS.currentTemplateId)) || '';
}

export async function setCurrentTemplateId(templateId) {
  await AsyncStorage.setItem(STORAGE_KEYS.currentTemplateId, templateId || '');
}

export async function getHidePickedEnabled() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.hidePickedEnabled);
  return raw === 'true';
}

export async function setHidePickedEnabled(enabled) {
  await AsyncStorage.setItem(STORAGE_KEYS.hidePickedEnabled, enabled ? 'true' : 'false');
}

export async function ensureInitialTemplate() {
  let templates = await getAllTemplates();
  if (templates.length === 0) {
    const defaultTemplate = {
      id: generateId('tpl'),
      name: 'Default',
      options: [
        { id: generateId('opt'), label: 'Option 1', type: 'text', enabled: true },
        { id: generateId('opt'), label: 'Option 2', type: 'text', enabled: true },
        { id: generateId('opt'), label: 'Option 3', type: 'text', enabled: true },
      ],
      hiddenOptionIds: [],
    };
    templates = [defaultTemplate];
    await saveAllTemplates(templates);
    await setCurrentTemplateId(defaultTemplate.id);
  }
  return templates;
}

export async function createTemplate(name) {
  const templates = await getAllTemplates();
  const newTemplate = {
    id: generateId('tpl'),
    name: name || 'New Template',
    options: [],
    hiddenOptionIds: [],
  };
  const next = [...templates, newTemplate];
  await saveAllTemplates(next);
  await setCurrentTemplateId(newTemplate.id);
  return newTemplate;
}

export async function deleteTemplate(templateId) {
  const templates = await getAllTemplates();
  
  // 刪除模板並清理所有引用該模板的 Sub-Template 選項
  const next = templates.map(t => {
    if (t.id === templateId) {
      // 跳過要刪除的模板
      return null;
    } else {
      // 清理引用該模板的 Sub-Template 選項
      const cleanedOptions = t.options.filter(option => 
        !(option.type === 'subtemplate' && option.subTemplateId === templateId)
      );
      return { ...t, options: cleanedOptions };
    }
  }).filter(t => t !== null); // 移除 null 值（被刪除的模板）
  
  await saveAllTemplates(next);
  const currentId = await getCurrentTemplateId();
  if (currentId === templateId) {
    await setCurrentTemplateId(next[0]?.id || '');
  }
}

export async function renameTemplate(templateId, name) {
  const templates = await getAllTemplates();
  const next = templates.map(t => {
    if (t.id === templateId) {
      // 更新模板名稱
      return { ...t, name };
    } else {
      // 更新所有引用該模板的 Sub-Template 選項
      const updatedOptions = t.options.map(option => {
        if (option.type === 'subtemplate' && option.subTemplateId === templateId) {
          return { ...option, label: name };
        }
        return option;
      });
      return { ...t, options: updatedOptions };
    }
  });
  await saveAllTemplates(next);
}

export async function addOption(templateId, label, type = 'text', subTemplateId = '') {
  const templates = await getAllTemplates();
  const next = templates.map(t => {
    if (t.id !== templateId) return t;
    const option = { id: generateId('opt'), label, type, subTemplateId, enabled: true };
    return { ...t, options: [...t.options, option] };
  });
  await saveAllTemplates(next);
}

export async function updateOption(templateId, optionId, updates) {
  const templates = await getAllTemplates();
  
  // 先檢查是否更新的是 Sub-Template 選項的 label
  let referencedTemplateId = null;
  if (updates.label) {
    const currentTemplate = templates.find(t => t.id === templateId);
    if (currentTemplate) {
      const option = currentTemplate.options.find(o => o.id === optionId);
      if (option && option.type === 'subtemplate' && option.subTemplateId) {
        referencedTemplateId = option.subTemplateId;
      }
    }
  }
  
  // 更新所有模板
  const next = templates.map(t => {
    if (t.id === templateId) {
      // 更新當前模板的選項
      return {
        ...t,
        options: t.options.map(o => (o.id === optionId ? { ...o, ...updates } : o)),
      };
    } else if (referencedTemplateId && t.id === referencedTemplateId) {
      // 更新被引用模板的名稱
      return { ...t, name: updates.label };
    }
    return t;
  });
  
  await saveAllTemplates(next);
}

export async function deleteOption(templateId, optionId) {
  const templates = await getAllTemplates();
  const next = templates.map(t => {
    if (t.id !== templateId) return t;
    return {
      ...t,
      options: t.options.filter(o => o.id !== optionId),
      hiddenOptionIds: (t.hiddenOptionIds || []).filter(id => id !== optionId),
    };
  });
  await saveAllTemplates(next);
}

export async function toggleOptionEnabled(templateId, optionId, enabled) {
  await updateOption(templateId, optionId, { enabled });
}

export async function getCurrentTemplate() {
  await ensureInitialTemplate();
  const [templates, currentId] = await Promise.all([
    getAllTemplates(),
    getCurrentTemplateId(),
  ]);
  return templates.find(t => t.id === currentId) || templates[0] || null;
}

export async function setHiddenOption(templateId, optionId, hidden) {
  const templates = await getAllTemplates();
  const next = templates.map(t => {
    if (t.id !== templateId) return t;
    const hiddenSet = new Set(t.hiddenOptionIds || []);
    if (hidden) hiddenSet.add(optionId); else hiddenSet.delete(optionId);
    return { ...t, hiddenOptionIds: Array.from(hiddenSet) };
  });
  await saveAllTemplates(next);
}

export async function clearHiddenOptions(templateId) {
  const templates = await getAllTemplates();
  const next = templates.map(t => (t.id === templateId ? { ...t, hiddenOptionIds: [] } : t));
  await saveAllTemplates(next);
}


