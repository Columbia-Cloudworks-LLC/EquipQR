import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NEW_WORK_ORDER_EVENT,
  openNewWorkOrder,
  shouldIgnoreNewWorkOrderShortcut,
} from './newWorkOrderLauncher';

function keydownFrom(target: HTMLElement, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('newWorkOrderLauncher', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('dispatches the request with the equipment and prefill', () => {
    const listener = vi.fn();
    window.addEventListener(NEW_WORK_ORDER_EVENT, listener);

    openNewWorkOrder({ equipmentId: 'eq-1', title: 'Repair: Horn' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      equipmentId: 'eq-1',
      title: 'Repair: Horn',
    });
    window.removeEventListener(NEW_WORK_ORDER_EVENT, listener);
  });

  it('allows the shortcut from non-editable page content', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(div))).toBe(false);
  });

  it.each(['input', 'textarea', 'select'])('ignores the shortcut while typing in a %s', (tag) => {
    const field = document.createElement(tag);
    document.body.appendChild(field);

    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(field))).toBe(true);
  });

  it('ignores the shortcut inside contenteditable content', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editor.appendChild(child);
    document.body.appendChild(editor);

    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(child))).toBe(true);
  });

  it('ignores modified keystrokes such as Ctrl+C / Cmd+C', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(div, { ctrlKey: true }))).toBe(true);
    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(div, { metaKey: true }))).toBe(true);
    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(div, { altKey: true }))).toBe(true);
  });

  it('ignores the shortcut while a dialog or menu is open', () => {
    const div = document.createElement('div');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(div, dialog);

    expect(shouldIgnoreNewWorkOrderShortcut(keydownFrom(div))).toBe(true);
  });
});
