export function attachAudioVolumeMonitor(stream, onVolumeChange) {
  if (!stream || stream.getAudioTracks().length === 0) return null;

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId = null;

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalizedVolume = Math.min(Math.max(average / 45, 0), 1); // 0.0 ile 1.0 aralığı
      onVolumeChange(normalizedVolume);
      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close().catch(() => {});
    };
  } catch (e) {
    console.error('Audio Visualizer başlatılamadı:', e);
    return null;
  }
}