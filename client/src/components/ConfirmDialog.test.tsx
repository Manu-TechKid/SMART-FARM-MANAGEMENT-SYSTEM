import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog component', () => {
  it('renders title, message, and triggers onConfirm and onCancel callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Confirm Dispatch"
        message="This will deduct batch stock once."
        confirmLabel="Dispatch Now"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Confirm Dispatch')).toBeDefined();
    expect(screen.getByText('This will deduct batch stock once.')).toBeDefined();

    fireEvent.click(screen.getByText('Dispatch Now'));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
