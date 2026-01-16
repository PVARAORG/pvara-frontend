import React, { useRef, useEffect } from 'react';
import p5 from 'p5';

interface AvatarProps {
  isActive: boolean;
  audioContext?: AudioContext;
}

export const Avatar: React.FC<AvatarProps> = ({ isActive, audioContext }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      let mouthOpen = 0;
      let targetMouthOpen = 0;

      p.setup = function () {
        const width = containerRef.current?.clientWidth || 300;
        const height = containerRef.current?.clientHeight || 400;
        p.createCanvas(width, height);
      };

      p.draw = function () {
        p.background(240);

        // Smoothly animate mouth opening
        mouthOpen += (targetMouthOpen - mouthOpen) * 0.1;

        // Draw face (circle)
        p.fill(255);
        p.stroke(33);
        p.strokeWeight(2);
        p.ellipse(p.width / 2, p.height / 2 - 20, 150, 180);

        // Draw eyes
        const eyeY = p.height / 2 - 50;
        const eyeDistance = 35;

        // Left eye
        p.fill(33);
        p.ellipse(p.width / 2 - eyeDistance, eyeY, 12, 18);
        p.fill(255);
        p.ellipse(p.width / 2 - eyeDistance, eyeY, 8, 14);

        // Right eye
        p.fill(33);
        p.ellipse(p.width / 2 + eyeDistance, eyeY, 12, 18);
        p.fill(255);
        p.ellipse(p.width / 2 + eyeDistance, eyeY, 8, 14);

        // Draw mouth (lips only)
        p.fill(220, 100, 120);
        p.noStroke();
        const mouthY = p.height / 2 + 40;
        const mouthWidth = 50;
        const mouthHeight = 15 + mouthOpen * 20;

        // Upper lip
        p.ellipse(p.width / 2, mouthY - 5, mouthWidth, mouthHeight * 0.4);

        // Lower lip
        p.ellipse(p.width / 2, mouthY + 10, mouthWidth, mouthHeight * 0.6);

        // Update mouth animation if active
        if (isActive) {
          targetMouthOpen = 0.3 + Math.sin(p.frameCount * 0.05) * 0.3;
        } else {
          targetMouthOpen = 0;
        }
      };

      p.windowResized = function () {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          p.resizeCanvas(width, height);
        }
      };
    };

    if (!sketchRef.current) {
      sketchRef.current = new p5(sketch, containerRef.current);
    }

    return () => {
      if (sketchRef.current) {
        sketchRef.current.remove();
        sketchRef.current = null;
      }
    };
  }, [isActive]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        border: '2px solid #ddd',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
      }}
    />
  );
};
