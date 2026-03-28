import React, { useState, useEffect, useRef, useCallback } from 'react';

type EmotionType = 'Joy' | 'Sadness' | 'Anger' | 'Fear' | 'Disgust' | 'Calm';
type PropType = 'Water' | 'Fire' | 'Grass' | 'Gas' | 'Soil' | 'Stone' | 'House' | 'Campfire' | 'Balloon' | 'HotAirBalloon' | 'FlyingHouse';

interface Emotion {
  id: string;
  type: EmotionType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  timer: number;
  lookBack: boolean;
}

interface GameProp {
  id: string;
  type: PropType;
  x: number;
  y: number;
  isDragging: boolean;
}

const EMOTIONS: Record<EmotionType, { color: string; shape: string; category: 'good' | 'bad' | 'neutral', label: string, face: string }> = {
  Joy: { color: '#FDE047', shape: 'circle', category: 'good', label: 'Joy', face: '(^▽^)' },
  Sadness: { color: '#60A5FA', shape: 'teardrop', category: 'bad', label: 'Sadness', face: '(T_T)' },
  Anger: { color: '#EF4444', shape: 'triangle', category: 'bad', label: 'Anger', face: '(Ò‸Ó)' },
  Fear: { color: '#A78BFA', shape: 'rectangle', category: 'bad', label: 'Fear', face: '(ﾟДﾟ;)' },
  Disgust: { color: '#4ADE80', shape: 'blob', category: 'bad', label: 'Disgust', face: '(¬_¬)' },
  Calm: { color: '#F3F4F6', shape: 'circle', category: 'neutral', label: 'Calm', face: '(￣_￣)' },
};

const PROP_CONFIG: Record<PropType, { icon: string; size: number; label: string }> = {
  Water: { icon: '💧', size: 80, label: 'Water' },
  Fire: { icon: '🔥', size: 80, label: 'Fire' },
  Grass: { icon: '🌿', size: 80, label: 'Grass' },
  Gas: { icon: '💨', size: 100, label: 'Gas' },
  Soil: { icon: '🟫', size: 100, label: 'Soil' },
  Stone: { icon: '🪨', size: 100, label: 'Stone' },
  House: { icon: '🏠', size: 130, label: 'House' },
  Campfire: { icon: '🏕️', size: 130, label: 'Campfire' },
  Balloon: { icon: '🎈', size: 130, label: 'Balloon' },
  HotAirBalloon: { icon: '🎈🔥', size: 200, label: 'Hot Air Balloon' },
  FlyingHouse: { icon: '🏠🎈', size: 200, label: 'Flying House' },
};

const RECIPES: { ingredients: [PropType, PropType], result: PropType }[] = [
  { ingredients: ['Water', 'Fire'], result: 'Gas' },
  { ingredients: ['Fire', 'Grass'], result: 'Soil' },
  { ingredients: ['Water', 'Grass'], result: 'Stone' },
  { ingredients: ['Water', 'Soil'], result: 'House' },
  { ingredients: ['Stone', 'Fire'], result: 'Campfire' },
  { ingredients: ['Gas', 'Grass'], result: 'Balloon' },
  { ingredients: ['Campfire', 'Balloon'], result: 'HotAirBalloon' },
  { ingredients: ['Balloon', 'House'], result: 'FlyingHouse' },
];

const SHAPE_STYLES: Record<string, React.CSSProperties> = {
  circle: { borderRadius: '50%' },
  teardrop: { borderRadius: '50% 0 50% 50%', transform: 'rotate(-45deg)' },
  triangle: { clipPath: 'polygon(0% 10%, 100% 10%, 50% 100%)' },
  rectangle: { borderRadius: '16px' },
  blob: { borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' },
};

export default function App() {
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [propsList, setPropsList] = useState<GameProp[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);
  
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const isGameOverRef = useRef(false);
  
  const dragInfo = useRef<{ id: string | null; type: 'emotion' | 'prop' | null; offsetX: number; offsetY: number }>({ 
    id: null, type: null, offsetX: 0, offsetY: 0 
  });

  const emotionsRef = useRef<Emotion[]>([]);
  const propsRef = useRef<GameProp[]>([]);

  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    setIsGameOver(false);
    setSandboxMode(false);
    isGameOverRef.current = false;
    
    const initialEmotions: Emotion[] = [];
    const types: EmotionType[] = ['Sadness', 'Anger', 'Fear', 'Disgust', 'Joy', 'Sadness', 'Anger', 'Fear'];
    
    const gameWidth = window.innerWidth - 192; // Subtract sidebar width (w-48 is 192px)
    const gameHeight = window.innerHeight;
    
    // Calculate grid for even distribution
    const cols = Math.ceil(Math.sqrt(types.length));
    const rows = Math.ceil(types.length / cols);
    const cellWidth = (gameWidth - 160) / cols;
    const cellHeight = (gameHeight - 160) / rows;
    
    for (let i = 0; i < types.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      initialEmotions.push({
        id: `emo-${Date.now()}-${i}`,
        type: types[i],
        x: 80 + col * cellWidth + Math.random() * (cellWidth * 0.6),
        y: 80 + row * cellHeight + Math.random() * (cellHeight * 0.6),
        vx: 0,
        vy: 0,
        isDragging: false,
        timer: Math.floor(Math.random() * 1000),
        lookBack: false,
      });
    }
    emotionsRef.current = initialEmotions;
    setEmotions([...initialEmotions]);
    
    propsRef.current = [];
    setPropsList([]);
  };

  const spawnProp = (type: PropType) => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const padding = 100;
    const safeWidth = Math.max(0, width - padding * 2);
    const safeHeight = Math.max(0, height - padding * 2);
    
    const newProp: GameProp = {
      id: `prop-${Date.now()}-${Math.random()}`,
      type,
      x: padding + Math.random() * safeWidth,
      y: padding + Math.random() * safeHeight,
      isDragging: false,
    };
    propsRef.current.push(newProp);
    setPropsList([...propsRef.current]);
  };

  const spawnRandomEmotion = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const nonJoyTypes: EmotionType[] = ['Sadness', 'Anger', 'Fear', 'Disgust', 'Calm'];
    const randomType = nonJoyTypes[Math.floor(Math.random() * nonJoyTypes.length)];
    
    const padding = 100;
    const safeWidth = Math.max(0, width - padding * 2);
    const safeHeight = Math.max(0, height - padding * 2);
    
    const newEmotion: Emotion = {
      id: `emo-${Date.now()}-${Math.random()}`,
      type: randomType,
      x: padding + Math.random() * safeWidth,
      y: padding + Math.random() * safeHeight,
      vx: 0,
      vy: 0,
      isDragging: false,
      timer: 0,
      lookBack: false,
    };
    emotionsRef.current.push(newEmotion);
    setEmotions([...emotionsRef.current]);
  };

  const update = useCallback(() => {
    if (!containerRef.current) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const currentEmotions = emotionsRef.current;
    const currentProps = propsRef.current;

    // Prop crafting logic
    let merged = false;
    for (let i = 0; i < currentProps.length; i++) {
      for (let j = i + 1; j < currentProps.length; j++) {
        const p1 = currentProps[i];
        const p2 = currentProps[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        
        if (dist < 60) {
          const recipe = RECIPES.find(r => 
            (r.ingredients[0] === p1.type && r.ingredients[1] === p2.type) ||
            (r.ingredients[0] === p2.type && r.ingredients[1] === p1.type)
          );
          
          if (recipe) {
            if (dragInfo.current.id === p1.id || dragInfo.current.id === p2.id) {
              dragInfo.current = { id: null, type: null, offsetX: 0, offsetY: 0 };
            }
            const newProp: GameProp = {
              id: `prop-${Date.now()}`,
              type: recipe.result,
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
              isDragging: false,
            };
            currentProps.splice(j, 1);
            currentProps.splice(i, 1);
            currentProps.push(newProp);
            merged = true;
            break;
          }
        }
      }
      if (merged) break;
    }

    currentEmotions.forEach(e => {
      if (e.isDragging) return;

      e.timer += 1;
      e.lookBack = false;

      // Healing logic from props
      currentProps.forEach(p => {
        const dist = Math.hypot(e.x - p.x, e.y - p.y);
        if (dist < 100) {
          if (p.type === 'House' && e.type === 'Anger') e.type = 'Calm';
          if (p.type === 'Campfire' && e.type === 'Sadness') e.type = 'Calm';
          if (p.type === 'Balloon' && e.type === 'Fear') e.type = 'Calm';
          if (p.type === 'HotAirBalloon' && (e.type === 'Sadness' || e.type === 'Fear')) e.type = 'Joy';
          if (p.type === 'FlyingHouse' && (e.type === 'Anger' || e.type === 'Fear')) e.type = 'Calm';
        }
      });

      switch (e.type) {
        case 'Joy': {
          if (e.timer % 30 === 0) {
            e.vx += (Math.random() - 0.5) * 6;
            e.vy += (Math.random() - 0.5) * 6;
          }
          e.vx *= 0.92;
          e.vy *= 0.92;
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
        case 'Sadness': {
          const distLeft = e.x;
          const distRight = width - e.x;
          const distTop = e.y;
          const distBottom = height - e.y;
          const minDistEdge = Math.min(distLeft, distRight, distTop, distBottom);
          
          if (minDistEdge > 100) {
            if (minDistEdge === distLeft) e.vx = -0.5;
            else if (minDistEdge === distRight) e.vx = 0.5;
            else if (minDistEdge === distTop) e.vy = -0.5;
            else if (minDistEdge === distBottom) e.vy = 0.5;
          } else {
            e.vx = 0;
            e.vy = 0;
            e.lookBack = true;
          }
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
        case 'Anger': {
          if (e.timer % 90 < 10) {
            if (e.timer % 90 === 0) {
              e.vx = (Math.random() - 0.5) * 30;
              e.vy = (Math.random() - 0.5) * 30;
            }
          }
          e.vx *= 0.8;
          e.vy *= 0.8;
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
        case 'Fear': {
          e.vy += 0.05; // Gravity sinking
          e.vx += (Math.random() - 0.5) * 1;
          e.vx *= 0.9;
          e.vy *= 0.95;
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
        case 'Disgust': {
          if (e.timer % 60 === 0) {
            e.vx = (Math.random() - 0.5) * 3;
            e.vy = (Math.random() - 0.5) * 3;
          }
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
        case 'Calm': {
          if (e.timer % 120 === 0) {
            e.vx = (Math.random() - 0.5) * 1.5;
            e.vy = (Math.random() - 0.5) * 1.5;
            
            // Randomly transform into other emotions, including Joy
            if (Math.random() < 0.2) {
              const allTypes: EmotionType[] = ['Joy', 'Sadness', 'Anger', 'Fear', 'Disgust'];
              e.type = allTypes[Math.floor(Math.random() * allTypes.length)];
            }
          }
          e.x += e.vx;
          e.y += e.vy;
          break;
        }
      }

      const padding = 40;
      if (e.x < padding) { e.x = padding; e.vx *= -1; }
      if (e.x > width - padding) { e.x = width - padding; e.vx *= -1; }
      if (e.y < padding) { e.y = padding; e.vy *= -1; }
      if (e.y > height - padding) { e.y = height - padding; e.vy *= -1; }
    });

    // Emotion interactions
    for (let i = 0; i < currentEmotions.length; i++) {
      for (let j = i + 1; j < currentEmotions.length; j++) {
        const e1 = currentEmotions[i];
        const e2 = currentEmotions[j];
        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const cat1 = EMOTIONS[e1.type].category;
          const cat2 = EMOTIONS[e2.type].category;

          if ((cat1 === 'good' && cat2 === 'bad') || (cat1 === 'bad' && cat2 === 'good')) {
            if (Math.random() < 0.03) {
              const newType = Math.random() > 0.5 ? 'Calm' : 'Joy';
              e1.type = newType;
              e2.type = newType;
            }
          }
          
          // Joy is infectious to Calm
          if ((e1.type === 'Calm' && e2.type === 'Joy') || (e1.type === 'Joy' && e2.type === 'Calm')) {
            if (Math.random() < 0.05) {
              e1.type = 'Joy';
              e2.type = 'Joy';
            }
          }

          if (dist < 80) {
            const force = (80 - dist) / 80;
            if (!e1.isDragging) {
              e1.x += (dx / dist) * force * 3;
              e1.y += (dy / dist) * force * 3;
            }
            if (!e2.isDragging) {
              e2.x -= (dx / dist) * force * 3;
              e2.y -= (dy / dist) * force * 3;
            }
          }
        }
      }
    }

    // End game check
    if (currentEmotions.length > 0 && currentEmotions.every(e => e.type === 'Joy')) {
      if (!isGameOverRef.current) {
        isGameOverRef.current = true;
        setIsGameOver(true);
      }
    }

    setEmotions([...currentEmotions]);
    setPropsList([...currentProps]);
    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  const handlePointerDown = (id: string, type: 'emotion' | 'prop', e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    if (type === 'emotion') {
      const emotion = emotionsRef.current.find(em => em.id === id);
      if (emotion) {
        emotion.isDragging = true;
        dragInfo.current = { id, type, offsetX: clientX - emotion.x, offsetY: clientY - emotion.y };
      }
    } else {
      const prop = propsRef.current.find(p => p.id === id);
      if (prop) {
        prop.isDragging = true;
        dragInfo.current = { id, type, offsetX: clientX - prop.x, offsetY: clientY - prop.y };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { id, type, offsetX, offsetY } = dragInfo.current;
    if (!id) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (type === 'emotion') {
      const emotion = emotionsRef.current.find(em => em.id === id);
      if (emotion) {
        emotion.x = clientX - offsetX;
        emotion.y = clientY - offsetY;
      }
    } else if (type === 'prop') {
      const prop = propsRef.current.find(p => p.id === id);
      if (prop) {
        prop.x = clientX - offsetX;
        prop.y = clientY - offsetY;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const { id, type } = dragInfo.current;
    
    if (type === 'emotion') {
      const emotion = emotionsRef.current.find(em => em.id === id);
      if (emotion) emotion.isDragging = false;
    } else if (type === 'prop') {
      const prop = propsRef.current.find(p => p.id === id);
      if (prop) prop.isDragging = false;
    }
    
    dragInfo.current = { id: null, type: null, offsetX: 0, offsetY: 0 };
  };

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#E6D5B8]">
      {/* Left Sidebar Control Panel */}
      <div className="w-48 bg-white/60 backdrop-blur-md border-r border-white/50 p-4 flex flex-col z-40 shadow-xl shrink-0">
        <h1 className="text-amber-900 font-black text-xl tracking-wider mb-4 leading-tight">
          Emotion<br/>Alchemist
        </h1>
        <p className="text-amber-900/80 text-xs mb-6 leading-relaxed font-medium">
          Drag elements to craft items and heal emotions.
        </p>
        
        <div className="flex flex-col gap-3 mb-6">
          <button 
            onClick={() => spawnProp('Water')}
            className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
          >
            Water
          </button>
          <button 
            onClick={() => spawnProp('Fire')}
            className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-900 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
          >
            Fire
          </button>
          <button 
            onClick={() => spawnProp('Grass')}
            className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-900 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
          >
            Grass
          </button>
        </div>

        {sandboxMode && (
          <div className="mb-6 pt-4 border-t border-amber-200/50">
            <button 
              onClick={spawnRandomEmotion}
              className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
            >
              + Add Emotion
            </button>
          </div>
        )}

        <div className="bg-amber-100/50 p-4 rounded-xl border border-amber-200/50 mt-auto">
          <h3 className="font-bold text-amber-900 mb-3 text-sm flex items-center gap-2">
            <span>💡</span> Hints
          </h3>
          <ul className="text-xs text-amber-900/80 space-y-3 font-medium">
            <li>1. Putting good and bad emotions together to make them calm down.</li>
            <li>2. Combine items to heal bad emotions!</li>
              <li>• Water+Fire=Gas</li>
              <li>• Water+Soil=House</li>
              <li>• Fire+Soil=?</li>
            <li>• Try combining them in pairs and keep exploring surprises!</li>
          </ul>
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative touch-none select-none"
        style={{
          backgroundImage: 'radial-gradient(#D4C3A3 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Render Props */}
        {propsList.map(prop => {
          const config = PROP_CONFIG[prop.type];
          const imgSrc = `/src/images/${prop.type}.png`;
          
          return (
            <div
              key={prop.id}
              onPointerDown={(e) => handlePointerDown(prop.id, 'prop', e)}
              className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-75"
              style={{
                width: config.size,
                height: config.size,
                left: prop.x - config.size / 2,
                top: prop.y - config.size / 2,
                transform: prop.isDragging ? 'scale(1.2)' : 'scale(1)',
                zIndex: prop.isDragging ? 40 : 5,
                fontSize: `${config.size * 0.8}px`,
                lineHeight: 1,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}
            >
              <img src={imgSrc} alt={prop.type} className="w-full h-full object-contain pointer-events-none" draggable={false} />
            </div>
          );
        })}

        {/* Render Emotions */}
        {emotions.map(emotion => {
          const config = EMOTIONS[emotion.type];
          const style = SHAPE_STYLES[config.shape];
          
          return (
            <div
              key={emotion.id}
              onPointerDown={(e) => handlePointerDown(emotion.id, 'emotion', e)}
              className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing shadow-xl transition-transform duration-75"
              style={{
                width: 80,
                height: 80,
                backgroundColor: config.color,
                left: emotion.x - 40,
                top: emotion.y - 40,
                ...style,
                transform: `${style.transform || ''} ${emotion.isDragging ? 'scale(1.15)' : 'scale(1)'}`,
                zIndex: emotion.isDragging ? 50 : 10,
                border: '3px solid rgba(255,255,255,0.4)'
              }}
            >
              <div 
                className="flex flex-col items-center justify-center pointer-events-none"
                style={{
                  transform: config.shape === 'teardrop' ? 'rotate(45deg)' : 'none',
                  marginBottom: config.shape === 'triangle' ? '15px' : '0'
                }}
              >
                <span className="text-sm font-black text-black/70 tracking-widest drop-shadow-md">
                  {emotion.lookBack ? 'Bye' : config.label}
                </span>
                {!emotion.lookBack && (
                  <span className="text-xs font-bold text-black/60 mt-0.5">
                    {config.face}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* End Game Overlay */}
        {isGameOver && !sandboxMode && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-white/30 backdrop-blur-lg">
            <div className="text-2xl md:text-4xl text-amber-900 font-black max-w-4xl text-center leading-relaxed px-8 animate-fade-in-up drop-shadow-[0_4px_4px_rgba(255,255,255,0.8)] pointer-events-auto">
              <p className="mb-10">
                It is completely normal to experience various negative emotions.<br/><br/>
                However, by finding special ways to channel and transform them,<br/><br/>
                we can reach a state of greater peace and joy.
              </p>
              <div className="flex gap-6 justify-center mt-8">
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold shadow-xl transition-transform hover:scale-105 cursor-pointer text-lg"
                >
                  Play Again
                </button>
                <button 
                  onClick={() => setSandboxMode(true)}
                  className="px-8 py-4 bg-white/90 hover:bg-white text-amber-900 rounded-2xl font-bold shadow-xl transition-transform hover:scale-105 cursor-pointer text-lg"
                >
                  Continue Sandbox
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
