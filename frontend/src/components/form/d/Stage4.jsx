import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormAlert } from "@/components/ui/form-alert"

const Stage4D = ({ initialData, isReview }) => {
    const [formData, setFormData] = useState({
        tackWelder: "TW-001",
        cleaning: "OK",
        grooveAngle: "35°",
        rootFace: "2mm",
        rootGap: "3mm",
        projection: "10mm",
        pcdHole: "ON center",
        rfPad: "Not Applicable",
        date: new Date().toLocaleDateString()
    })

    const [alert, setAlert] = useState({ show: false, type: 'success', message: '' })

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = () => {
        setAlert({ show: true, type: 'success', message: 'Stage 4 Submitted Successfully' })
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Nozzle Set-Up</CardTitle>
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
                        <Label>Tack Welder</Label>
                        <Input
                            value={formData.tackWelder}
                            onChange={(e) => handleChange('tackWelder', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Material identification of Shell / Dish / Nozzle / RF Pad</Label>
                        <Select
                            value={formData.materialId}
                            onValueChange={(val) => handleChange('materialId', val)}
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

                    <div className="space-y-2">
                        <Label>L-Seam NDT (if applicable)</Label>
                        <Select
                            value={formData.lSeamNdt}
                            onValueChange={(val) => handleChange('lSeamNdt', val)}
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
                        <Label>Cleaning of Nozzle & Weld Area</Label>
                        <Select
                            value={formData.cleaning}
                            onValueChange={(val) => handleChange('cleaning', val)}
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
                        <Label>Groove Angle</Label>
                        <Input
                            value={formData.grooveAngle}
                            onChange={(e) => handleChange('grooveAngle', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Root face</Label>
                        <Input
                            value={formData.rootFace}
                            onChange={(e) => handleChange('rootFace', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Root Gap</Label>
                        <Input
                            value={formData.rootGap}
                            onChange={(e) => handleChange('rootGap', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Projection from Reference line to Flange face</Label>
                        <Input
                            value={formData.projection}
                            onChange={(e) => handleChange('projection', e.target.value)}
                            disabled={isReview}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>PCD hole OFF center / ON center</Label>
                        <Select
                            value={formData.pcdHole}
                            onValueChange={(val) => handleChange('pcdHole', val)}
                            disabled={isReview}
                        >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OFF center">OFF center</SelectItem>
                                <SelectItem value="ON center">ON center</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>RF pad setup as applicable</Label>
                        <Select
                            value={formData.rfPad}
                            onValueChange={(val) => handleChange('rfPad', val)}
                            disabled={isReview}
                        >
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Applicable">Applicable</SelectItem>
                                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                            </SelectContent>
                        </Select>
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
                            <Button onClick={handleSubmit}>Save & Complete Stage 4</Button>
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

export default Stage4D
