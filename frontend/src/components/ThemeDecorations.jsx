function ThemeDecorations({ decorations = [] }) {
  return (
    <div className="theme-decorations" aria-hidden="true">
      {decorations.map((decoration, index) => (
        <span key={`${decoration}-${index}`}>{decoration}</span>
      ))}
    </div>
  );
}

export default ThemeDecorations;
