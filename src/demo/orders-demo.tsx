import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FileText } from 'lucide-react';
import type { DrugName, TreatmentOrdersV1 } from '@/types';
import { OrdersEditor } from '@/components/treatment-orders/orders-editor';
import { Button } from '@/components/ui/button';
import { makeMedicationOrder, makeTextOrder } from '@/lib/treatment-orders';
import '@/index.css';
import './orders-demo.css';

// Demo fixtures only; the production component never imports these names or orders.
const names: DrugName[] = ['Levofloxacin', 'Neurosyn', 'Hydrocortisol', 'VT-amlopril', 'Bamburol', 'Fatig', 'Magie B6', 'Natriclorid'].map(name => ({ id: name, name }));
const initial: TreatmentOrdersV1 = { version: 1, items: [
  makeTextOrder('Thở BIPAP I/E 12/6 10 lít/phút'),
  { ...makeMedicationOrder(), name: 'Levofloxacin', strength: '0,5 g', dose: '1,5', unit: 'chai', route: 'TTM', timing: '8h14', rate: { value: 'XXX', unit: 'giọt/phút' } },
  { ...makeMedicationOrder(), name: 'Neurosyn', strength: '3 g', dose: '1', unit: 'lọ', repeat: '4', route: 'TTM', timing: 'mỗi 6h', rate: { value: 'XXX', unit: 'g/p' }, relations: [{ id: 'mix', kind: 'mix', name: 'Natriclorid 0,9%', amount: '100', unit: 'mL' }] },
  { ...makeMedicationOrder(), marker: '(TT) 2.', name: 'Hydrocortisol', strength: '100 mg', dose: '½', unit: 'lọ', repeat: '4', route: 'TMC', timing: 'mỗi 6h' },
  { ...makeMedicationOrder(), name: 'Pavinjec [cần đối chiếu tên]', strength: '40 mg', dose: '1', unit: 'lọ', route: 'TMC', timing: '8h14' },
  { ...makeMedicationOrder(), name: 'VT-amlopril', strength: '8/5 mg', dose: '1', unit: 'viên', route: '(u)' },
  { ...makeMedicationOrder(), name: 'Bamburol', strength: '10 mg', dose: '1', unit: 'viên', route: '(u)' },
  { ...makeMedicationOrder(), marker: '(TT)', name: 'Fatig', dose: '1', unit: 'ống', repeat: '2', route: '(u)', timing: '8h14' },
  { ...makeMedicationOrder(), marker: '(TT)', name: 'Magie B6', dose: '2', unit: 'viên', route: '(u)' },
  { ...makeMedicationOrder(), name: 'Zencombi', dose: '1', unit: 'ống', repeat: '6', route: '[chữ bị che]', timing: 'mỗi 4h từ 8h14' },
  makeTextOrder('CS2- NK01- cháo'), makeTextOrder('Tập VLTL (4)'),
  makeTextOrder('Xét nghiệm: Pro-calcitonin(TP), TPTTBM, ĐGĐ, Mg, Albumin, KMĐM'),
] };
function Demo() {
  const [value, setValue] = useState(() => structuredClone(initial));
  const [generation, setGeneration] = useState(0);
  return <div className="orders-demo-page">
    <div className="orders-demo-meta"><span>Demo riêng · Cùng component với phiếu điều trị</span><Button variant="ghost" size="sm" onClick={() => { setValue(structuredClone(initial)); setGeneration(old => old + 1); }}>Đặt lại</Button></div>
    <section className="orders-demo-card"><h1><FileText size={20} />Chỉ định</h1><OrdersEditor key={generation} value={value} onChange={setValue} drugNames={names} /></section>
    <p className="orders-demo-note">Dữ liệu từ ảnh để thử giao diện; chỗ khó đọc giữ dấu đối chiếu. Tải lại trang sẽ đặt lại. Không kết nối hồ sơ hoặc thư viện thuốc thật.</p>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
