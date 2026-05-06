import type { StockLevel } from '../../types/cocktails';
import './StockBottle.css';

const LEVELS: StockLevel[] = [0, 25, 50, 75, 100];

interface Props {
  value: StockLevel;
  onChange?: (v: StockLevel) => void;
  readonly?: boolean;
}

export default function StockBottle({ value, onChange, readonly = false }: Props) {
  return (
    <div className="stock-bottle" aria-label={`Stock level: ${value}%`}>
      <div className="stock-bottle-segments">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            disabled={readonly}
            className={`stock-segment ${value >= level && level > 0 ? 'filled' : ''} ${level === 0 ? 'empty-seg' : ''}`}
            onClick={() => !readonly && onChange?.(level)}
            aria-label={`Set stock to ${level}%`}
          />
        ))}
      </div>
      <div className="stock-bottle-shape">
        <div
          className="stock-bottle-fill"
          style={{ height: `${value}%` }}
        />
      </div>
      <span className="stock-bottle-label">{value}%</span>
    </div>
  );
}
