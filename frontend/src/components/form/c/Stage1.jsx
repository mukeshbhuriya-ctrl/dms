import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage1C = ({ initialData, isReview }) => {
    // Dummy Data State if no initialData
    const [formData, setFormData] = useState({
        materialIdMarks: initialData?.inspectionData?.s1_data?.materialIdMarks || "Available",
        nozzleNumber: initialData?.inspectionData?.s1_data?.nozzleNumber || "N1",
        tackWelder: "TW-001",
        visualInspection: "OK",
        lSeamRt: "OK",
        nozzleSize: "100mm",
        totalLength: "500mm",
        date: new Date().toLocaleDateString()
    })

    // Mock Engineers
    const prodEngineers = [{ id: "1", name: "PROD ENG 1" }]
    const qcEngineers = [{ id: "2", name: "QC ENG 1" }]

    const [prodEng, setProdEng] = useState(prodEngineers[0].id)
    const [qcEng, setQcEng] = useState("")

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = () => {
        setAlert({ show: true, type: 'success', message: 'Stage 1 Submitted Successfully' })
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Material Identification Marks & Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {alert.show && <FormAlert type={alert.type} message={alert.message} onClose={() => setAlert({ ...alert, show: false })} />}

                <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-lg">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Shreno Manufacturer sr. no.:</Label>
                            <Input value={initialData?.msnNumber || ""} className="bg-muted" placeholder="MSN" />
                        </div>
                        <div className="space-y-2">
                            <Label>Equipment Name & Tag Number:</Label>
                            <Input value={`${initialData?.equipment || ""} ${initialData?.tagNo || ""}`} />
                        </div>
                        <div className="space-y-2">
                            <Label>Drawing no. :</Label>
                            <Input value={initialData?.drgNo || ""} />
                        </div>
                    </div>
                </div>

                {/* Stage 1: Material Identification Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">I. Material Identification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Characteristics to be checked</Label>
                            <Input value={initialData?.jointNo || ""} readOnly className="bg-muted font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label>Nozzle Number</Label>
                            <Input
                                value={formData.nozzleNumber}
                                onChange={(e) => handleChange('nozzleNumber', e.target.value)}
                                disabled={isReview}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Material identification Marks</Label>
                            <Select
                                value={formData.materialIdMarks}
                                onValueChange={(val) => handleChange('materialIdMarks', val)}
                                disabled={isReview}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="Not Available">Not Available</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Stage 2: Setup Section */}
                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-lg">II. Set Up</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Tack Welder</Label>
                            <Input
                                value={formData.tackWelder}
                                onChange={(e) => handleChange('tackWelder', e.target.value)}
                                disabled={isReview}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Visual Inspection</Label>
                            <Select
                                value={formData.visualInspection}
                                onValueChange={(val) => handleChange('visualInspection', val)}
                                disabled={isReview}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Acceptance of L-Seam RT</Label>
                            <Select
                                value={formData.lSeamRt}
                                onValueChange={(val) => handleChange('lSeamRt', val)}
                                disabled={isReview}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="Not OK">Not OK</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border p-4 rounded-md space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Dimensions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nozzle Size</Label>
                                <Input
                                    value={formData.nozzleSize}
                                    onChange={(e) => handleChange('nozzleSize', e.target.value)}
                                    disabled={isReview}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Length</Label>
                                <Input
                                    value={formData.totalLength}
                                    onChange={(e) => handleChange('totalLength', e.target.value)}
                                    disabled={isReview}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-lg">Set Up Inspection by</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Production Engineer Name:</Label>
                            <Input
                                value="PROD ENG 1"
                                readOnly
                                className="bg-muted uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Date:</Label>
                            <Input
                                value={formData.date}
                                readOnly
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>QE Engineer:</Label>
                            <Select disabled={isReview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select QE Engineer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="QC1">QC ENG 1</SelectItem>
                                    <SelectItem value="QC2">QC ENG 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 items-center pt-4">
                        {!isReview ? (
                            <Button onClick={handleSubmit}>Save & Complete Stage 1</Button>
                        ) : (
                            <>
                                <Input
                                    value={`Approve Date: ${new Date().toLocaleDateString()}`}
                                    readOnly
                                    className="bg-muted w-auto min-w-[200px] text-center h-9 font-medium"
                                />
                                <Button variant="outline">Reject</Button>
                                <Button>Approve</Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default Stage1C
