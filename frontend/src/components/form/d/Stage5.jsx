import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage6D = ({ initialData, isReview }) => {
    const [formData, setFormData] = useState({
        visualInspection: "OK",
        welderNo: "W-888",
        weldingProcess: "GTAW",
        filletSize: "5mm",
        date: new Date().toLocaleDateString()
    })

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = () => {
        setAlert({ show: true, type: 'success', message: 'Stage 6 Submitted Successfully' })
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Stage 6: Inspection after full Welding</CardTitle>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Label>R.T. (if applicable)</Label>
                        <Select
                            value={formData.rt}
                            onValueChange={(val) => handleChange('rt', val)}
                            disabled={isReview}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OK">OK</SelectItem>
                                <SelectItem value="Not OK">Not OK</SelectItem>
                                <SelectItem value="N/A">N/A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Welder No.</Label>
                        <Input
                            value={formData.welderNo}
                            onChange={(e) => handleChange('welderNo', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Welding process</Label>
                        <Input
                            value={formData.weldingProcess}
                            onChange={(e) => handleChange('weldingProcess', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Fillet size</Label>
                        <Input
                            value={formData.filletSize}
                            onChange={(e) => handleChange('filletSize', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                </div>

                {/* Set Up Inspection Section Matching Stage1.jsx */}
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
                            <Button onClick={handleSubmit}>Save & Complete Stage 6</Button>
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

export default Stage6D
