import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { PERMISSION_MODULES, ALL_ACTIONS } from '@/config/permissions';

/**
 * PermissionMatrix Component
 * 
 * @param {Object} props
 * @param {Record<string, Record<string, 'allow' | 'deny' | 'inherited_allow' | 'inherited_deny'>>} props.matrixState
 * @param {(moduleId: string, action: string, state: 'allow' | 'deny' | null) => void} props.onChange
 * @param {boolean} props.disabled
 */
export default function PermissionMatrix({ matrixState, onChange, disabled }) {

  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-semibold text-slate-700 sticky left-0 bg-slate-50 min-w-[200px] z-10">
              Module
            </TableHead>
            {ALL_ACTIONS.map(action => (
              <TableHead key={action} className="text-center font-semibold text-slate-700">
                {action}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_MODULES.map(record => (
            <TableRow key={record.id} className="hover:bg-slate-50/50">
              <TableCell className="font-medium text-slate-700 sticky left-0 bg-white z-10">
                {record.name}
              </TableCell>
              {ALL_ACTIONS.map(action => {
                const isSupported = record.actions.includes(action);
                
                if (!isSupported) {
                  return (
                    <TableCell key={action} className="text-center">
                      <span className="text-slate-300">-</span>
                    </TableCell>
                  );
                }

                const state = matrixState[record.id]?.[action] || 'inherited_deny';
                const isChecked = state === 'allow' || state === 'inherited_allow';
                const isOverride = state === 'allow' || state === 'deny';

                return (
                  <TableCell key={action} className="text-center">
                    <Checkbox
                      disabled={disabled}
                      checked={isChecked}
                      className={isOverride ? 'border-blue-500 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white' : ''}
                      onCheckedChange={(checked) => {
                        onChange(record.id, action, checked ? 'allow' : 'deny');
                      }}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
