import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Хяналтын самбар"
        description="Борлуулалт, ашиг орлогын товч мэдээлэл энд харагдана."
      />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Ашгийн самбарыг S4 хэсэгт нэмнэ. Одоогоор зүүн талын цэснээс бараа, захиалга,
          нөөцийн хуудсууд руу орно уу.
        </CardContent>
      </Card>
    </>
  )
}
