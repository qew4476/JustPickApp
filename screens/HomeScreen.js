import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, FlatList, PanResponder, Animated } from 'react-native';
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
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragAnimValue = useRef(new Animated.Value(0)).current;
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const initialTouchPosition = useRef({ x: 0, y: 0 });

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

  // 計算字符串的UTF-8字節長度
  function getByteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  // 截取字符串到指定字節長度
  function truncateByBytes(str, maxBytes) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const bytes = encoder.encode(str);
    
    if (bytes.length <= maxBytes) {
      return str;
    }
    
    // 截取到最大字節長度
    const truncatedBytes = bytes.slice(0, maxBytes);
    let truncatedStr = decoder.decode(truncatedBytes);
    
    // 如果截取後的字節長度仍然超過限制，繼續截取
    while (getByteLength(truncatedStr) > maxBytes) {
      truncatedStr = truncatedStr.slice(0, -1);
    }
    
    return truncatedStr + '...';
  }

  async function onSelectTemplate(templateId) {
    await setCurrentTemplateId(templateId);
    const tpl = await getCurrentTemplate();
    setTemplate(tpl);
    setShowTemplateDropdown(false);
    setLastResult(null); // 清空結果，因為切換了模板
  }

  // 創建拖動響應器 - 只在拖動手柄區域響應
  const createDragResponder = useCallback((item, index) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true, // 響應觸控開始
      onMoveShouldSetPanResponder: () => true, // 響應移動
      onStartShouldSetPanResponderCapture: () => false, // 不攔截觸控事件，讓 TouchableOpacity 先處理
      onMoveShouldSetPanResponderCapture: () => false, // 不攔截移動事件
      
      onPanResponderGrant: (evt, gestureState) => {
        setDraggedItem(item);
        setDraggedIndex(index);
        
        // 記錄初始觸摸位置
        initialTouchPosition.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY
        };
        
        // 設置初始位置
        dragPosition.setValue({ x: 0, y: 0 });
        
        // 開始拖動動畫
        Animated.parallel([
          Animated.spring(dragAnimValue, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(dragScale, {
            toValue: 1.1,
            useNativeDriver: true,
          })
        ]).start();
      },
      
      onPanResponderMove: (evt, gestureState) => {
        // 計算相對於初始位置的偏移
        const currentX = evt.nativeEvent.pageX;
        const currentY = evt.nativeEvent.pageY;
        const offsetX = currentX - initialTouchPosition.current.x;
        const offsetY = currentY - initialTouchPosition.current.y;
        
        // 更新拖動位置
        dragPosition.setValue({
          x: offsetX,
          y: offsetY
        });
        
        // 計算當前拖動位置對應的索引
        const itemHeight = 48; // 每個項目的高度
        const relativeY = offsetY + (draggedIndex * itemHeight);
        let newIndex = Math.round(relativeY / itemHeight);
        
        // 確保索引在有效範圍內
        newIndex = Math.max(0, Math.min(templates.length - 1, newIndex));
        
        // 如果拖動到有效位置且與當前不同，更新目標索引
        if (newIndex !== dragOverIndex && newIndex !== draggedIndex && newIndex >= 0 && newIndex < templates.length) {
          setDragOverIndex(newIndex);
        }
      },
      
      onPanResponderRelease: async () => {
        const targetIndex = dragOverIndex !== null ? dragOverIndex : draggedIndex;
        
        // 立即更新數據
        if (draggedIndex !== null && draggedIndex !== targetIndex && targetIndex !== null) {
          const newTemplates = [...templates];
          const [draggedTemplate] = newTemplates.splice(draggedIndex, 1);
          newTemplates.splice(targetIndex, 0, draggedTemplate);
          
          setTemplates(newTemplates);
          
          // 保存新的順序到存儲
          import('../storage/templates').then(({ saveAllTemplates }) => {
            saveAllTemplates(newTemplates);
          });
        }
        
        // 重置狀態
        setDraggedItem(null);
        setDraggedIndex(null);
        setDragOverIndex(null);
        setIsAnimating(true);
        
        // 快速重置位置動畫
        Animated.parallel([
          Animated.timing(dragPosition, {
            toValue: { x: 0, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dragAnimValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(dragScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => {
          setIsAnimating(false);
        });
      },
    });
  }, [templates, dragOverIndex, draggedIndex, dragAnimValue, dragPosition, dragScale, initialTouchPosition]);

  return (
    <View style={styles.container}>
      {/* 模板選擇 Dropdown */}
      <View style={styles.templateSelector}>
        <TouchableOpacity 
          onPress={() => setShowTemplateDropdown(true)}
          style={styles.templateButton}
        >
          <Text style={styles.templateButtonText}>
            {template ? truncateByBytes(template.name, 24) : getWord('Select Template')}
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
              renderItem={({ item, index }) => {
                const panResponder = createDragResponder(item, index);
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;
                
                // 計算其他項目的位移
                let translateY = 0;
                if (draggedIndex !== null && !isDragging && !isAnimating) {
                  if (draggedIndex < index && dragOverIndex !== null && dragOverIndex >= index) {
                    translateY = -48; // 向上移動一個項目高度
                  } else if (draggedIndex > index && dragOverIndex !== null && dragOverIndex <= index) {
                    translateY = 48; // 向下移動一個項目高度
                  }
                }
                
                return (
                  <View style={styles.templateOptionWrapper}>
                    <Animated.View
                      style={[
                        styles.templateOption,
                        template && template.id === item.id && styles.templateOptionActive,
                        isDragging && styles.templateOptionDragging,
                        isDragOver && styles.templateOptionDragOver,
                        {
                          transform: [
                            {
                              translateX: isDragging ? dragPosition.x : 0,
                            },
                            {
                              translateY: isDragging ? dragPosition.y : translateY,
                            },
                            {
                              scale: isDragging ? dragScale : dragAnimValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.05],
                              }),
                            },
                          ],
                          opacity: isDragging ? 0.9 : 1,
                          zIndex: isDragging ? 1000 : 1,
                          elevation: isDragging ? 8 : 0,
                          shadowColor: isDragging ? '#000' : 'transparent',
                          shadowOffset: isDragging ? { width: 0, height: 4 } : { width: 0, height: 0 },
                          shadowOpacity: isDragging ? 0.3 : 0,
                          shadowRadius: isDragging ? 8 : 0,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => onSelectTemplate(item.id)}
                        style={styles.templateOptionContent}
                      >
                        <Text style={[
                          styles.templateOptionText,
                          template && template.id === item.id && styles.templateOptionTextActive
                        ]}>
                          {truncateByBytes(item.name, 24)}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.dragHandleContainer}>
                        <Animated.View
                          {...panResponder.panHandlers}
                          style={styles.dragHandleTouchable}
                        >
                          <Text style={styles.dragHandle}>⋮⋮</Text>
                        </Animated.View>
                      </View>
                    </Animated.View>
                  </View>
                );
              }}
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
  templateOptionWrapper: {
    marginBottom: 8,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  templateOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  templateOptionContent: {
    flex: 1,
    paddingRight: 8,
  },
  templateOptionText: {
    fontSize: 16,
    color: '#333',
  },
  templateOptionTextActive: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  templateOptionDragging: {
    backgroundColor: '#e0e0e0',
    opacity: 0.9,
  },
  templateOptionDragOver: {
    backgroundColor: '#f8f8f8',
  },
  dragHandleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleTouchable: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    minWidth: 40,
  },
  dragHandle: {
    fontSize: 16,
    color: '#999',
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


