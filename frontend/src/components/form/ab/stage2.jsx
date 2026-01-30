import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function Stage2({ backChip = false, stage = "stage2" }) {
  // Back chip section
  const [productionEngineerName] = useState("Production Engineer Name") // Static value
  const [todayDate] = useState(new Date().toLocaleDateString())
  const [backChipQcEngineer, setBackChipQcEngineer] = useState("")

  // Weld Visual Inspection section
  const [weldVisualQcEngineer, setWeldVisualQcEngineer] = useState("")
  const [welderNo, setWelderNo] = useState("")

  // Mock QC Engineers data
  const qcEngineers = [
    { id: "1", name: "QC Engineer 1" },
    { id: "2", name: "QC Engineer 2" },
    { id: "3", name: "QC Engineer 3" },
  ]

  // For stage3 with backChip: true, show Weld Visual Inspection section only
  // For stage2: backChip: true shows Back chip, backChip: false shows Weld Visual Inspection
  const shouldShowBackChipSection =
    stage === "stage2" && backChip === true
  const shouldShowWeldVisualSection =
    (stage === "stage2" && backChip === false) ||
    (stage === "stage3" && backChip === true)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Section 1: Back chip - Only show for stage2 with backChip = true */}
      {shouldShowBackChipSection && (
        <Card>
          <CardHeader>
            <CardTitle>Back chip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backChipQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={backChipQcEngineer}
                  onValueChange={setBackChipQcEngineer}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Weld Visual Inspection by - Show for stage2 with backChip = false OR stage3 with backChip = true */}
      {shouldShowWeldVisualSection && (
        <Card>
          <CardHeader>
            <CardTitle>Weld Visual Inspection by</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Production Engineer Name:</Label>
                <Input
                  type="text"
                  value={productionEngineerName}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Date:</Label>
                <Input
                  type="text"
                  value={todayDate}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldVisualQcEngineer">QC Engineer Name:</Label>
                <Select
                  value={weldVisualQcEngineer}
                  onValueChange={setWeldVisualQcEngineer}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select QC Engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {qcEngineers.map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welderNo">Welder No.:</Label>
                <Input
                  id="welderNo"
                  type="text"
                  value={welderNo}
                  onChange={(e) => setWelderNo(e.target.value)}
                  placeholder="Enter Welder No."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Stage2

