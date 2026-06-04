export const departments = [
  { id: 1, name: 'Stamping' },
  { id: 2, name: 'Assembly' },
  { id: 3, name: 'Plant Maintenance' },
  { id: 4, name: 'DPC' },
  { id: 5, name: 'PPIC' },
  { id: 6, name: 'PE & Tool Maintenance' },
  { id: 7, name: 'Tool Manufacture' },
  { id: 8, name: 'NPC' },
  { id: 9, name: 'Quality Assurance' },
  { id: 10, name: 'EHS' },
  { id: 11, name: 'QEMS' },
  { id: 12, name: 'Sales' },
  { id: 13, name: 'Finance Accounting' },
  { id: 14, name: 'Purchasing' },
  { id: 15, name: 'ICT' },
  { id: 16, name: 'HRGA' },
  { id: 17, name: 'Thailand Team' },
  { id: 18, name: 'Security' },
]

export const getDepartmentIdByName = (name) => {
  return departments.find((department) => department.name === name)?.id || ''
}
