export default function AIBrief({ brief, item }) {
  if (!brief) return <div style={{ color: '#9aa' }}>Generating AI brief...</div>;
  if (brief.error) return <div style={{ color: '#e74c3c' }}>{brief.error}</div>;

  return (
    <>
      <div style={{ color: '#cfe', lineHeight: 1.5 }}>
        {brief.summary}
        {brief._aiGenerated && <span style={{ marginLeft: 8, fontSize: 11, color: '#3498db' }}>AI</span>}
      </div>

      <h5 style={{ margin: '12px 0 6px' }}>Risk Notes</h5>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {brief.riskNotes?.map((note, i) => (
          <li key={i} style={{ fontSize: 13, color: '#9aa' }}>{note}</li>
        ))}
      </ul>

      <h5 style={{ margin: '12px 0 4px' }}>Score Breakdown</h5>
      <div style={{ fontSize: 13, color: '#9aa' }}>
        Time: {brief._scoreBreakdown.timeScore} · 
        Premium: {brief._scoreBreakdown.premiumScore} · 
        Touchpoints: {brief._scoreBreakdown.touchpointScore} · 
        Days left: {brief._scoreBreakdown.daysToExpiry}
      </div>
    </>
  );
}