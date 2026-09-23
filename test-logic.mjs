import { damp, clamp, smoothstep } from './src/lib/ease.js';

let progress = 0;
const totalActs = 7;
const actDuration = 1 / totalActs;

for (let i = 0; i < totalActs; i++) {
  const actStart = i * actDuration;
  const center = actStart + (actDuration * 0.5);
  const distance = (progress - center) / (actDuration * 1.5); 
  
  const zOffset = -(distance * 1000); 
  
  let alpha = 0;
  if (distance > -1 && distance < 1) {
    alpha = 1 - Math.abs(distance);
    alpha = smoothstep(0, 1, alpha * 1.5);
  }
  
  console.log(`Act ${i}: distance=${distance.toFixed(3)}, alpha=${alpha.toFixed(3)}, z=${zOffset.toFixed(1)}`);
}
