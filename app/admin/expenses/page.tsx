import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { DeleteExpenseButton } from '@/components/admin/expenses/delete-expense-button'
import { ExpenseForm } from '@/components/admin/expenses/expense-form'
import { formatMNT } from '@/lib/money'
import { getExpensesByMonth } from '@/server/queries/expenses'

export const metadata = { title: 'Зардал — Cora' }

const MONTH_NAMES = [
  '1-р сар',
  '2-р сар',
  '3-р сар',
  '4-р сар',
  '5-р сар',
  '6-р сар',
  '7-р сар',
  '8-р сар',
  '9-р сар',
  '10-р сар',
  '11-р сар',
  '12-р сар',
]

function monthLabel(month: string): string {
  const [year, monthPart] = month.split('-')
  const index = Number(monthPart) - 1
  return `${year} оны ${MONTH_NAMES[index] ?? month}`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default async function ExpensesPage() {
  const months = await getExpensesByMonth()

  return (
    <>
      <PageHeader title="Зардал" description="Үйл ажиллагааны зардлыг сараар харна." />

      <div className="space-y-6">
        <ExpenseForm />

        {months.length === 0 ? (
          <EmptyState title="Зардал бүртгэгдээгүй" description="Дээрх формоор эхний зардлаа нэмнэ үү." />
        ) : (
          months.map((month) => (
            <Card key={month.month}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{monthLabel(month.month)}</CardTitle>
                <span className="font-medium tabular-nums">{formatMNT(month.total)}</span>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Огноо</TableHead>
                      <TableHead>Ангилал</TableHead>
                      <TableHead>Тайлбар</TableHead>
                      <TableHead className="text-right">Дүн</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {month.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.expenseDate)}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.description ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMNT(row.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteExpenseButton expenseId={row.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
