import { useRef, useState, useMemo, useEffect } from 'react';
import { Animated, Easing, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Text as SvgText, G, Circle, Defs, TextPath } from 'react-native-svg';

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

const Wheel = ({ options, onResult }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);

  const visibleOptions = useMemo(() => options.filter(o => o.enabled !== false), [options]);

  // 當選項改變時，重置旋轉狀態和動畫值
  useEffect(() => {
    rotation.setValue(0);
    setSpinning(false);
  }, [options, rotation]);

  function spin() {
    if (spinning || visibleOptions.length === 0) return;
    setSpinning(true);
    const chosenIndex = Math.floor(Math.random() * visibleOptions.length);
    const selectedOption = visibleOptions[chosenIndex];
    const fullRotations = 4 + Math.floor(Math.random() * 3);
    const segment = 360 / Math.max(visibleOptions.length, 1);
    const targetDeg = fullRotations * 360 - (chosenIndex * segment + segment / 2);

    Animated.timing(rotation, {
      toValue: targetDeg,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      rotation.setValue(targetDeg % 360);
      setSpinning(false);
      onResult && onResult(selectedOption);
    });
  }

  const interpolated = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  function createSlicePath(centerX, centerY, radius, startAngle, endAngle) {
    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  function createRadialTextPath(centerX, centerY, startRadius, endRadius, angle) {
    const angleRad = ((angle - 90) * Math.PI) / 180;
    
    const x1 = centerX + startRadius * Math.cos(angleRad);
    const y1 = centerY + startRadius * Math.sin(angleRad);
    const x2 = centerX + endRadius * Math.cos(angleRad);
    const y2 = centerY + endRadius * Math.sin(angleRad);
    
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  function renderSlice(option, index, totalSlices) {
    const angle = 360 / totalSlices;
    const startAngle = index * angle;
    const endAngle = startAngle + angle;
    // 使用選項的原始索引來選擇顏色，確保顏色一致性
    const originalIndex = options.findIndex(o => o.id === option.id);
    const color = colors[originalIndex % colors.length];

    const centerX = 150;
    const centerY = 150;
    const radius = 150;

    // Special-case: when only one slice remains, draw a full circle.
    if (totalSlices === 1) {
      const fontSize = 16;
      const textStartRadius = 30;
      const textEndRadius = radius - 30;
      
      // 創建放射狀文字路徑（從中心向上）
      const textPathId = `textPath-${option.id}`;
      const textPath = createRadialTextPath(centerX, centerY, textStartRadius, textEndRadius, 0); // 0度 = 向上
      
      return (
        <G key={option.id}>
          <Circle cx={centerX} cy={centerY} r={radius} fill={color} stroke="#fff" strokeWidth="2" />
          
          {/* 定義文字路徑 */}
          <Defs>
            <Path id={textPathId} d={textPath} />
          </Defs>
          
          {/* 文字 - 沿著放射狀路徑顯示 */}
          <SvgText
            fontSize={fontSize}
            fontWeight="bold"
            fill="#333"
          >
            <TextPath href={`#${textPathId}`} startOffset="0%">
              {option.type === 'subtemplate' ? '⭐ ' : ''}{option.label}
            </TextPath>
          </SvgText>
        </G>
      );
    }

    const path = createSlicePath(centerX, centerY, radius, startAngle, endAngle);

    // 計算扇形的中心角度
    const centerAngle = (startAngle + endAngle) / 2;
    const centerAngleRad = ((centerAngle - 90) * Math.PI) / 180;
    
    // 計算文字可以使用的半徑範圍（留出邊緣空隙）
    const edgeMargin = 25; // 離邊緣的空隙
    const textStartRadius = 20; // 從中心開始的半徑
    const textEndRadius = radius - edgeMargin; // 結束半徑（留出邊緣空隙）
    
    // 根據扇形大小調整文字大小
    const segmentSize = angle;
    let fontSize;
    
    if (segmentSize >= 60) {
      fontSize = 12;
    } else if (segmentSize >= 30) {
      fontSize = 10;
    } else {
      fontSize = 8;
    }

    // 創建放射狀文字路徑
    const textPathId = `textPath-${option.id}`;
    const textPath = createRadialTextPath(centerX, centerY, textStartRadius, textEndRadius, centerAngle);

    return (
      <G key={option.id}>
        <Path d={path} fill={color} stroke="#fff" strokeWidth="2" />
        
        {/* 定義文字路徑 */}
        <Defs>
          <Path id={textPathId} d={textPath} />
        </Defs>
        
        {/* 文字 - 沿著放射狀路徑顯示 */}
        <SvgText
          fontSize={fontSize}
          fontWeight="bold"
          fill="#333"
        >
          <TextPath href={`#${textPathId}`} startOffset="0%">
            {option.type === 'subtemplate' ? '⭐ ' : ''}{option.label}
          </TextPath>
        </SvgText>
      </G>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.wheelContainer}>
        {/* 指針：黑色外框 + 白色實心 */}
        <View style={styles.pointerBorder} />
        <View style={styles.pointer} />

        <Animated.View style={{ transform: [{ rotate: interpolated }] }}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            {visibleOptions.map((option, index) => renderSlice(option, index, visibleOptions.length))}
          </Svg>
        </Animated.View>
      </View>
      <TouchableOpacity
        onPress={spin}
        disabled={spinning || visibleOptions.length === 0}
        style={[
          styles.spinButton,
          (spinning || visibleOptions.length === 0) && styles.spinButtonDisabled
        ]}
      >
        <Text style={styles.spinButtonText}>{spinning ? '...' : 'Spin'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelContainer: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 4,
    borderColor: '#555',
  },
  // 黑色外框
  pointerBorder: {
    position: 'absolute',
    top: -22,
    left: '50%',
    marginLeft: -17,
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderTopWidth: 42,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#000', // 黑色外框
    zIndex: 9,
  },
  // 白色實心指針
  pointer: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -15,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    zIndex: 10,
  },
  spinButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1976d2',
    borderRadius: 8,
  },
  spinButtonDisabled: {
    backgroundColor: '#90caf9',
  },
  spinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Wheel;
