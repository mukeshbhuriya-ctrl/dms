const WELD_STAGES_CONFIG = {
    A: [
        { id: "stage1", label: "LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT", component: "Stage1" },
        { id: "stage2", label: "Back chip", component: "Stage2", condition: "back_chip_req" },
        { id: "stage3", label: "Weld Visual Inspection", component: "Stage3" },
        { id: "stage4", label: "Radiography Testing (RT)", component: "Stage4", condition: "rt" },
        { id: "stage5", label: "Penetrant Testing (PT)", component: "Stage5", condition: "pt" },
        { id: "stage6", label: "Post Weld Heat Treatment (PWHT) - Radiography Testing (RT)", component: "Stage6", condition: "pwht" },
        { id: "stage7", label: "Post Weld Heat Treatment (PWHT) - Penetrant Testing (PT)", component: "Stage6", condition: "pwht" },
    ],
    B: [
        { id: "stage1", label: "LONG SEAM / CIRCUMFERENCE SEAM INSPECTION REPORT", component: "Stage1" },
        { id: "stage2", label: "Back chip", component: "Stage2", condition: "back_chip_req" },
        { id: "stage3", label: "Weld Visual Inspection", component: "Stage3" },
        { id: "stage4", label: "Radiography Testing (RT)", component: "Stage4", condition: "rt" },
        { id: "stage5", label: "Penetrant Testing (PT)", component: "Stage5", condition: "pt" },
        { id: "stage6", label: "Post Weld Heat Treatment (PWHT) - Radiography Testing (RT)", component: "Stage6", condition: "pwht" },
        { id: "stage7", label: "Post Weld Heat Treatment (PWHT) - Penetrant Testing (PT)", component: "Stage6", condition: "pwht" },
    ],
    C: [
        { id: "stage1", label: "Material Identification Marks & Setup", component: "Stage1C" },
        { id: "stage2", label: "Back chip", component: "Stage2", condition: "back_chip_req" },
        { id: "stage3", label: "Weld Visual", component: "Stage3C" },
        { id: "stage4", label: "Post Weld Heat Treatment (PWHT) - Radiography Testing (RT)", component: "Stage4", condition: "pwht" },
        { id: "stage5", label: "Post Weld Heat Treatment (PWHT) - Penetrant Testing (PT)", component: "Stage5", condition: "pwht" },
    ],
    D: [
        { id: "stage1", label: "Material Identification Marks & Setup", component: "Stage1C" },
        { id: "stage2", label: "Back chip", component: "Stage2", condition: "back_chip_req" },
        { id: "stage3", label: "Nozzle / Attachment Setup Orientation & Elevation", component: "Stage3D" },
        { id: "stage4", label: "Nozzle / Attachment Internal visual inspection", component: "Stage4D" },
        { id: "stage5", label: "Nozzle / Attachment RF Pad pneumatic / vacuum box test", component: "Stage5D" },
        { id: "stage6", label: "L - SEAM / C - SEAM NDT inspection", component: "Stage6D" },
        { id: "stage7", label: "Post Weld Heat Treatment (PWHT) - Radiography Testing (RT)", component: "Stage6", condition: "pwht" },
        { id: "stage8", label: "Post Weld Heat Treatment (PWHT) - Penetrant Testing (PT)", component: "Stage6", condition: "pwht" },
    ],
    F: [
        { id: "stage1", label: "Stage 1: Set Up", component: "Stage1F" },
        { id: "stage2", label: "Stage 2: WELD Visual", component: "Stage2F" },
        { id: "stage3", label: "Post Weld Heat Treatment (PWHT) - Radiography Testing (RT)", component: "Stage3F", condition: "pwht" },
        { id: "stage4", label: "Post Weld Heat Treatment (PWHT) - Penetrant Testing (PT)", component: "Stage3F", condition: "pwht" },
    ]
};

module.exports = WELD_STAGES_CONFIG;
