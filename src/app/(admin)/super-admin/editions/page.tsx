import { adminService } from "@/server/services/admin.service";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FreezeEditionButton } from "@/components/admin/FreezeEditionButton";

export default async function AdminEditionsPage() {
  const editions = await adminService.getEditionsForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Editions</h2>
        <p className="text-muted-foreground">
          Manage and monitor all festival editions
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Edition</TableHead>
              <TableHead>Festival</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((edition) => (
              <TableRow key={edition.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {edition.name || `Edition ${edition.number}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ID: {edition.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{edition.festival.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {edition.festival.owner.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                    <span>{format(edition.startDate, "MMM d, yyyy")}</span>
                    <span className="text-xs text-muted-foreground">
                      to {format(edition.endDate, "MMM d, yyyy")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      edition.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {edition.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{edition.tier}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {edition.status === "ACTIVE" && (
                    <FreezeEditionButton
                      editionId={edition.id}
                      editionName={edition.name || `Edition ${edition.number}`}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
