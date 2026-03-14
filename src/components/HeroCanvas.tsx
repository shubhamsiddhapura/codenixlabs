import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useMotionValue, useSpring } from 'framer-motion';

const AnimatedSphere = () => {
  const mesh = useRef<THREE.Mesh>(null!);
  const { viewport, mouse } = useThree();
  
  // Motion values for smooth animation
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Spring physics for smooth movement
  const springX = useSpring(mouseX, { stiffness: 50, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 25 });
  
  // Update position on mouse move
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    
    // Rotation animation
    mesh.current.rotation.x = clock.getElapsedTime() * 0.2;
    mesh.current.rotation.y = clock.getElapsedTime() * 0.1;
    
    // Update position based on mouse
    mouseX.set(mouse.x * viewport.width / 3);
    mouseY.set(mouse.y * viewport.height / 3);
    
    mesh.current.position.x = springX.get();
    mesh.current.position.y = springY.get();
  });
  
  return (
    <Sphere args={[2, 64, 64]} ref={mesh} position={[0, 0, 0]}>
      <MeshDistortMaterial 
        color="#8948FF" 
        attach="material" 
        distort={0.4} 
        speed={1.5} 
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  );
};

const ParticleField = () => {
  const points = useRef<THREE.Points>(null!);
  const count = 2000;
  
  // Create particle positions
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < positions.length; i += 3) {
    // Random position
    positions[i] = (Math.random() - 0.5) * 30;      // x
    positions[i + 1] = (Math.random() - 0.5) * 30;  // y
    positions[i + 2] = (Math.random() - 0.5) * 30;  // z
    
    // Random color
    colors[i] = Math.random() * 0.5 + 0.5; // r (purple to blue)
    colors[i + 1] = Math.random() * 0.2;   // g
    colors[i + 2] = Math.random() * 0.8;   // b
  }
  
  // Update animation
  useFrame(({ clock }) => {
    if (!points.current) return;
    
    const time = clock.getElapsedTime();
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Simple oscillation for particles
      points.current.geometry.attributes.position.array[i3 + 1] += 
        Math.sin(time + i * 0.1) * 0.01;
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.rotation.y = time * 0.05;
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={count} 
          array={positions} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          count={count} 
          array={colors} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.05} 
        vertexColors 
        transparent 
        opacity={0.7} 
      />
    </points>
  );
};

const HeroCanvas: React.FC = () => {
  return (
    <Canvas 
      camera={{ position: [0, 0, 10], fov: 60 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 8]} intensity={1.5} color="#8948FF" />
      <pointLight position={[8, 0, 0]} intensity={1} color="#48A9FF" />
      <AnimatedSphere />
      <ParticleField />
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        enableRotate={false} 
      />
    </Canvas>
  );
};

export default HeroCanvas;
