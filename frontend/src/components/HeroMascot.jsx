function HeroMascot({ src, message, size = "medium" }) {
  return (
    <div className={`hero-mascot hero-mascot-${size}`}>
      <div className="hero-mascot-glow" aria-hidden="true" />
      <img src={src} alt="CutSmart companion" />
      {message && <div className="hero-mascot-bubble">{message}</div>}
    </div>
  );
}

export default HeroMascot;
