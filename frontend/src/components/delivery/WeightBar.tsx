const SUCCESS = '#16A34A';

export default function WeightBar({ used, capacity }: { used: number; capacity?: number | null }) {
  if (!capacity) {
    return <span className="text-[11px] text-gray-400">{used.toLocaleString('vi-VN')} kg (xe chưa cấu hình tải trọng)</span>;
  }
  const pct = Math.min(100, (used / capacity) * 100);
  const over = used > capacity;
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: over ? '#DC2626' : SUCCESS }} />
      </div>
      <span className="text-[11px]" style={{ color: over ? '#DC2626' : '#6B7280' }}>
        {used.toLocaleString('vi-VN')} / {capacity.toLocaleString('vi-VN')} kg
      </span>
    </div>
  );
}
