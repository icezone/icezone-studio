// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('env', () => {
  it('should be node', () => {
    const hasWindow = typeof window !== 'undefined';
    console.log('hasWindow:', hasWindow);
    console.log('File === global.File:', File === globalThis.File);
    
    const f = new File([new Uint8Array([1,2,3])], 'test.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', f);
    const req = new Request('http://localhost/', { method: 'POST', body: fd });
    return req.formData().then(formData => {
      const file = formData.get('file');
      console.log('file.constructor.name:', (file as File)?.constructor?.name);
      console.log('file instanceof File:', file instanceof File);
      expect(file instanceof File).toBe(true);
    });
  })
})
