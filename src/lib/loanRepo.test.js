import { describe, expect, it } from 'vitest'
import { loanToRow, rowToLoan } from './loanRepo.js'

const row = {
  id: '11111111-1111-1111-1111-111111111111',
  owner_id: '22222222-2222-2222-2222-222222222222',
  friend_name: 'มด',
  item_name: 'หนังสือ',
  borrowed_date: '2026-09-01',
  due_date: '2026-09-10',
  returned_date: null,
  created_at: '2026-09-01T00:00:00Z',
}

describe('rowToLoan', () => {
  it('แปลง snake_case เป็น camelCase', () => {
    expect(rowToLoan(row)).toEqual({
      id: row.id,
      ownerId: row.owner_id,
      friendName: 'มด',
      itemName: 'หนังสือ',
      borrowedDate: '2026-09-01',
      dueDate: '2026-09-10',
      returnedDate: null,
    })
  })

  it('คงวันที่คืนจริงไว้เมื่อมีค่า', () => {
    expect(rowToLoan({ ...row, returned_date: '2026-09-05' }).returnedDate).toBe('2026-09-05')
  })

  it('แปลงค่าที่ไม่มี returned_date เป็น null', () => {
    const { returned_date: _omit, ...rest } = row
    expect(rowToLoan(rest).returnedDate).toBeNull()
  })
})

describe('loanToRow', () => {
  const loan = rowToLoan(row)

  it('แปลง camelCase เป็น snake_case', () => {
    expect(loanToRow(loan)).toEqual({
      friend_name: 'มด',
      item_name: 'หนังสือ',
      borrowed_date: '2026-09-01',
      due_date: '2026-09-10',
      returned_date: null,
    })
  })

  it('ไม่ส่ง id และ owner_id ไปฐานข้อมูล', () => {
    const out = loanToRow(loan)
    expect(out).not.toHaveProperty('id')
    expect(out).not.toHaveProperty('owner_id')
  })

  it('ยกเลิกการคืนส่ง returned_date เป็น null', () => {
    expect(loanToRow({ ...loan, returnedDate: undefined }).returned_date).toBeNull()
  })
})
