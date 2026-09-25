// แปลงระหว่างแถวในตาราง loans (snake_case) กับ Loan ในแอป (camelCase)
export function rowToLoan(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    friendName: row.friend_name,
    itemName: row.item_name,
    borrowedDate: row.borrowed_date,
    dueDate: row.due_date,
    returnedDate: row.returned_date ?? null,
  }
}

// ไม่ส่ง id และ owner_id: id สร้างที่ฐานข้อมูล, owner_id ตั้งเป็น auth.uid() อัตโนมัติและห้ามแก้
export function loanToRow(loan) {
  return {
    friend_name: loan.friendName,
    item_name: loan.itemName,
    borrowed_date: loan.borrowedDate,
    due_date: loan.dueDate,
    returned_date: loan.returnedDate ?? null,
  }
}
