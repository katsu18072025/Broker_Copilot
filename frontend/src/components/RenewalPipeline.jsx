export default function RenewalPipeline({ items, selected, onSelect }) {
  return (
    <aside style={{ width: 320, background: '#071127', padding: 10, borderRadius: 8 }}>
      <h4 style={{ margin: '0 0 8px' }}>Pipeline ({items.length})</h4>
      {items.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#9aa' }}>
          No renewals. Click "Sync Data" to load.
        </div>
      ) : (
        items.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            style={{
              padding: 8,
              border: selected?.id === item.id ? '1px solid #2ecc71' : '1px solid #123',
              marginTop: 8,
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontWeight: 600 }}>{item.clientName}</div>
            <div style={{ fontSize: 12, color: '#9aa' }}>{item.productLine} · {item.expiryDate}</div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Priority: <b style={{ color: item.priorityScore >= 70 ? '#e74c3c' : '#f39c12' }}>{item.priorityScore}</b></span>
              <span style={{ fontSize: 11, color: '#9aa' }}>{item.status}</span>
            </div>
          </div>
        ))
      )}
    </aside>
  );
}