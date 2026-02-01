import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ColorChips from '../ColorChips';

describe('ColorChips', () => {
  it('renders color chips for provided colors', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    render(<ColorChips colors={colors} />);

    const chips = screen.getAllByTitle(/#/);
    expect(chips).toHaveLength(3);
  });

  it('limits display to 3 colors max', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
    render(<ColorChips colors={colors} />);

    const chips = screen.getAllByTitle(/#/);
    expect(chips).toHaveLength(3);
  });

  it('renders with small size by default', () => {
    const colors = ['#ff0000'];
    render(<ColorChips colors={colors} />);

    const chip = screen.getByTitle('#ff0000');
    expect(chip).toHaveClass('w-4', 'h-4');
  });

  it('renders with medium size when specified', () => {
    const colors = ['#ff0000'];
    render(<ColorChips colors={colors} size="md" />);

    const chip = screen.getByTitle('#ff0000');
    expect(chip).toHaveClass('w-5', 'h-5');
  });

  it('applies correct background color style', () => {
    const colors = ['#ff0000'];
    render(<ColorChips colors={colors} />);

    const chip = screen.getByTitle('#ff0000');
    expect(chip).toHaveStyle({ backgroundColor: '#ff0000' });
  });
});
