
import React, { useEffect, useRef } from 'react';

interface BinaryRainProps {
  isEnding?: boolean;
}

const BinaryRain: React.FC<BinaryRainProps> = ({ isEnding = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();

    // Mật độ cao với fontSize nhỏ
    const fontSize = 12; 
    const columns = Math.floor(canvas.width / fontSize);
    
    // Khởi tạo các giọt nước rải rác
    const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -120);

    // Tốc độ rơi: Giảm nhẹ so với bản "rất nhanh" để trông mượt hơn nhưng vẫn sôi động
    const columnMeta = new Array(columns).fill(0).map(() => ({
      size: Math.floor(Math.random() * 6) + 10,
      speed: Math.random() * 0.8 + 0.5 // Tốc độ vừa phải (0.5 - 1.3)
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        // Màu đen với độ trong suốt thay đổi theo trạng thái ending
        const alpha = isEnding ? 0.4 : 0.7;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; 
        ctx.font = `bold ${columnMeta[i].size}px monospace`;

        const text = Math.random() > 0.5 ? '1' : '0';
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        if (y > -20 && y < canvas.height + 50) {
          ctx.fillText(text, x, y);
        }

        // Logic reset: Nếu không phải giai đoạn kết thúc thì đưa lên đầu lại
        if (y > canvas.height) {
          if (!isEnding) {
            drops[i] = -2; 
            columnMeta[i].speed = Math.random() * 0.8 + 0.5;
          } else {
            // Khi đang kết thúc, cho giọt nước "biến mất" bằng cách đẩy ra xa khỏi vùng nhìn thấy
            drops[i] = 10000; 
          }
        }

        // Di chuyển giọt nước, nếu đang kết thúc có thể cho rơi nhanh hơn một chút để dọn sạch màn hình
        drops[i] += isEnding ? columnMeta[i].speed * 1.2 : columnMeta[i].speed;
      }
    };

    const interval = setInterval(draw, 25); // ~40fps cho cảm giác điện ảnh

    const handleResize = () => {
      setCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [isEnding]); // Re-run effect or update logic when isEnding changes

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 z-[9999] bg-transparent pointer-events-none transition-opacity duration-3000 ${isEnding ? 'opacity-40' : 'opacity-100'}`}
    />
  );
};

export default BinaryRain;
