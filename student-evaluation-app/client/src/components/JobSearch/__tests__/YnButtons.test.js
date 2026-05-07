import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import YnButtons from '../YnButtons';

describe('YnButtons', () => {
  test('renders Y/N/NA by default and highlights the active value', () => {
    const onChange = jest.fn();
    render(<YnButtons value="N" onChange={onChange} />);
    const yes = screen.getByRole('button', { name: 'Y' });
    const no = screen.getByRole('button', { name: 'N' });
    const na = screen.getByRole('button', { name: 'NA' });
    expect(yes).toBeInTheDocument();
    expect(no).toHaveClass('active');
    expect(na).not.toHaveClass('active');
  });

  test('clicking a button calls onChange with that value', () => {
    const onChange = jest.fn();
    render(<YnButtons value="unknown" onChange={onChange} includeUnknown />);
    fireEvent.click(screen.getByRole('button', { name: 'Y' }));
    expect(onChange).toHaveBeenCalledWith('Y');
  });

  test('includeUnknown adds the ? button mapped to "unknown"', () => {
    const onChange = jest.fn();
    render(<YnButtons value="Y" onChange={onChange} includeUnknown />);
    fireEvent.click(screen.getByRole('button', { name: '?' }));
    expect(onChange).toHaveBeenCalledWith('unknown');
  });

  test('respects custom options list', () => {
    const onChange = jest.fn();
    render(<YnButtons value="Y" onChange={onChange} options={['Y', 'N']} />);
    expect(screen.queryByRole('button', { name: 'NA' })).toBeNull();
  });
});
