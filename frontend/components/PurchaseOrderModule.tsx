
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  PurchaseOrder, GRN, Invoice, MasterRecord, MasterType, 
  Frequency, TransactionType, Attachment, ItemLine, PurchaseRequest,
  User, WorkflowRule, Budget, BudgetType, BudgetControlType, ModuleType, ApprovalType
} from '../types';
import { DEPARTMENTS, DEPT_SUBDEPT_MAP, CENTERS } from '../constants';
import MultiSelect from './MultiSelect';
import { AlertCircle, Info, ShieldCheck, ShieldAlert } from 'lucide-react';

interface PurchaseOrderModuleProps {
  masters: Record<MasterType, MasterRecord[]>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  grns: GRN[];
  setGrns: React.Dispatch<React.SetStateAction<GRN[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  pendingPR: PurchaseRequest | null;
  onPOCreated: () => void;
  currentUser: User;
  workflows: WorkflowRule[];
  budgets: Budget[];
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>;
}

type ViewMode = 'PO' | 'GRN' | 'Invoice';

const PurchaseOrderModule: React.FC<PurchaseOrderModuleProps> = ({ 
  masters, purchaseOrders, setPurchaseOrders, grns, setGrns, invoices, setInvoices, pendingPR, onPOCreated, currentUser, workflows, budgets, setBudgets
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('PO');
  
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);

  const [bulkUploadType, setBulkUploadType] = useState<'PO' | 'GRN' | 'Invoice' | null>(null);

  // Form states
  const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
    entityName: masters.Entity?.[0]?.name || '',
    vendorId: '',
    vendorSiteId: '',
    transactionType: 'Material',
    validFrom: '',
    validTo: '',
    frequency: 'One-Time',
    department: '',
    subDepartment: '',
    paymentTerms: '',
    centerNames: [],
    items: [{ id: Math.random().toString(), itemName: '', quantity: 1, rate: 0, amount: 0, remarks: '' }],
    tds: 0,
    gst: 0,
    amount: 0,
    remarks: '',
    attachments: [],
    shippingAddressId: '',
    billingAddressId: '',
    isUnbudgeted: false,
    unbudgetedJustification: ''
  });

  // Handle pending PR
  useEffect(() => {
    if (pendingPR) {
      setShowForm(true);
      setPoForm({
        entityName: pendingPR.entityName,
        vendorId: pendingPR.vendorId || '',
        vendorSiteId: pendingPR.vendorSiteId || '',
        transactionType: pendingPR.transactionType || 'Material',
        validFrom: pendingPR.validFrom || new Date().toISOString().split('T')[0],
        validTo: pendingPR.validTo || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        frequency: pendingPR.frequency || 'One-Time',
        department: pendingPR.department,
        subDepartment: pendingPR.subDepartment,
        paymentTerms: pendingPR.paymentTerms || '',
        centerNames: pendingPR.centerNames,
        items: pendingPR.items.map(item => ({
          ...item,
          id: Math.random().toString(), // New IDs for PO items
        })),
        remarks: `Created from ${pendingPR.id}: ${pendingPR.remarks}`,
        amount: pendingPR.amount,
        attachments: pendingPR.attachments.map(att => ({ ...att, source: 'PO' })),
        tds: 0,
        gst: 0,
        shippingAddressId: pendingPR.shippingAddressId || '',
        billingAddressId: pendingPR.billingAddressId || '',
        isUnbudgeted: pendingPR.isUnbudgeted,
        unbudgetedJustification: pendingPR.unbudgetedJustification
      });
    }
  }, [pendingPR]);

  const [grnForm, setGrnForm] = useState<Partial<GRN>>({
    entityName: masters.Entity?.[0]?.name || '',
    vendorSiteId: '',
    location: '',
    invoiceNumber: '',
    items: [],
    amount: 0,
    remarks: '',
    attachments: [],
    shippingAddressId: '',
    billingAddressId: ''
  });

  // Recalculate all items when top-level TDS or GST changes
  useEffect(() => {
    setPoForm(prev => {
      const vendor = masters.Vendor.find(v => v.id === prev.vendorId);
      const center = masters.Center.find(c => c.name === prev.centerNames?.[0]);
      const isIntraState = vendor && center && vendor.state === center.state;
      const tdsPercent = prev.tds || 0;
      const gstPercent = prev.gst || 0;

      const updatedItems = (prev.items || []).map(item => {
        const qty = item.quantity || 0;
        const rate = item.rate || 0;
        const baseAmount = qty * rate;
        const tdsAmount = baseAmount * (tdsPercent / 100);
        const gstAmount = baseAmount * (gstPercent / 100);
        
        const updated = { 
          ...item, 
          amount: baseAmount,
          tds: tdsPercent,
          gst: gstPercent,
          tdsAmount,
          gstAmount
        };
        
        if (isIntraState) {
          updated.cgst = gstAmount / 2;
          updated.sgst = gstAmount / 2;
          updated.igst = 0;
        } else {
          updated.cgst = 0;
          updated.sgst = 0;
          updated.igst = gstAmount;
        }
        
        updated.totalAmount = baseAmount + gstAmount - tdsAmount;
        return updated;
      });

      return { ...prev, items: updatedItems };
    });
  }, [poForm.tds, poForm.gst, poForm.vendorId, poForm.centerNames]);

  const addItem = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...(prev.items || []), { id: Math.random().toString(), itemName: '', quantity: 1, rate: 0, amount: 0, tds: 0, gst: 0, remarks: '', coaCode: '' }]
    }));
  };

  const removeItem = (id: string) => {
    setPoForm(prev => ({
      ...prev,
      items: (prev.items || []).filter(i => i.id !== id)
    }));
  };

  const updateItem = (id: string, field: keyof ItemLine, value: any) => {
    setPoForm(prev => {
      const vendor = masters.Vendor.find(v => v.id === prev.vendorId);
      const center = masters.Center.find(c => c.name === prev.centerNames?.[0]);
      const isIntraState = vendor && center && vendor.state === center.state;
      const tdsPercent = prev.tds || 0;
      const gstPercent = prev.gst || 0;

      return {
        ...prev,
        items: (prev.items || []).map(item => {
          if (item.id === id) {
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'rate' || field === 'tds' || field === 'gst') {
              const qty = updated.quantity || 0;
              const rate = updated.rate || 0;
              
              const baseAmount = qty * rate;
              const tdsAmount = baseAmount * (tdsPercent / 100);
              const gstAmount = baseAmount * (gstPercent / 100);
              
              updated.amount = baseAmount;
              updated.tds = tdsPercent;
              updated.gst = gstPercent;
              updated.tdsAmount = tdsAmount;
              updated.gstAmount = gstAmount;
              
              if (isIntraState) {
                updated.cgst = gstAmount / 2;
                updated.sgst = gstAmount / 2;
                updated.igst = 0;
              } else {
                updated.cgst = 0;
                updated.sgst = 0;
                updated.igst = gstAmount;
              }
              
              updated.totalAmount = baseAmount + gstAmount - tdsAmount;
            }
            return updated;
          }
          return item;
        })
      };
    });
  };

  const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
    entityName: masters.Entity?.[0]?.name || '',
    vendorSiteId: '',
    location: '',
    attachments: [],
    shippingAddressId: '',
    billingAddressId: ''
  });

  // Update total amount whenever items change
  useEffect(() => {
    const total = (poForm.items || []).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    setPoForm(prev => ({ ...prev, amount: total }));
  }, [poForm.items]);

  const downloadTemplate = (type: 'PO' | 'GRN' | 'Invoice') => {
    const headers = 'Item Name,Qty,Rate,Remarks';
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${type}_Template.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'PO' | 'GRN' | 'Invoice') => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const newItems: ItemLine[] = data.map((row: any) => {
          const itemName = row['Item Name'] || row['itemName'] || '';
          const qty = parseFloat(row['Qty'] || row['quantity'] || '0');
          const rate = parseFloat(row['Rate'] || row['rate'] || '0');
          
          const base = qty * rate;
          const tdsPercent = poForm.tds || 0;
          const gstPercent = poForm.gst || 0;
          const tdsAmount = base * (tdsPercent / 100);
          const gstAmount = base * (gstPercent / 100);

          return {
            id: Math.random().toString(),
            itemName,
            quantity: qty,
            rate,
            amount: base,
            tds: tdsPercent,
            gst: gstPercent,
            tdsAmount,
            gstAmount,
            totalAmount: base + gstAmount - tdsAmount,
            remarks: row['Remarks'] || row['remarks'] || ''
          };
        });

        if (type === 'PO') {
          setPoForm(prev => ({ ...prev, items: newItems }));
        } else if (type === 'GRN' && selectedPO) {
          // For GRN, we might want to validate against PO items
          setGrnForm(prev => ({ 
            ...prev, 
            items: newItems, 
            amount: newItems.reduce((sum, i) => sum + (i.totalAmount || 0), 0) 
          }));
        } else if (type === 'Invoice' && selectedGRN) {
          setInvoiceForm(prev => ({ ...prev, items: newItems }));
        }
        
        alert(`Bulk upload for ${type} processed: ${newItems.length} items found.`);
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
      }
    });

    e.target.value = '';
  };

  const handleCreatePO = () => {
    // Validation
    if (!poForm.vendorId || !poForm.department || !poForm.subDepartment || (poForm.centerNames || []).length === 0) {
      alert('Please fill all mandatory header fields.');
      return;
    }
    if ((poForm.items || []).some(i => !i.itemName || !i.remarks)) {
      alert('Item Name and Remarks are mandatory for all item lines.');
      return;
    }

    if (poForm.isUnbudgeted && !poForm.unbudgetedJustification) {
      alert('Justification is mandatory for unbudgeted expenses.');
      return;
    }

    const budgetCheck = checkBudget(poForm);
    if (!budgetCheck.ok) {
      alert(budgetCheck.errors?.join('\n'));
      return;
    }

    const newPO: PurchaseOrder = {
      ...poForm as PurchaseOrder,
      id: `PO-${Math.floor(Math.random() * 10000)}`,
      status: budgetCheck.ok ? 'Pending' : 'Budget Hold',
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      attachments: poForm.attachments || []
    };
    setPurchaseOrders([...purchaseOrders, newPO]);
    setShowForm(false);
    resetForms();
    if (pendingPR) onPOCreated();
  };

  const checkBudget = (po: Partial<PurchaseOrder>) => {
    if (po.isUnbudgeted) return { ok: true };

    const errors: string[] = [];
    po.items?.forEach(item => {
      if (!item.coaCode) return;
      const budget = budgets.find(b => b.coaCode === item.coaCode);
      if (!budget) {
        errors.push(`No budget found for GL Code ${item.coaCode}`);
        return;
      }
      const available = budget.amount - budget.consumedAmount;
      if ((item.totalAmount || item.amount) > available && budget.controlType === BudgetControlType.HARD_STOP) {
        errors.push(`Budget exceeded for GL ${item.coaCode} - Available: ₹${available.toLocaleString()} | Required: ₹${(item.totalAmount || item.amount).toLocaleString()}`);
      }
    });

    return { ok: errors.length === 0, errors };
  };

  const deductBudget = (po: PurchaseOrder) => {
    if (po.isUnbudgeted) return;

    setBudgets(prev => prev.map(budget => {
      const poItemsForGL = po.items.filter(i => i.coaCode === budget.coaCode);
      if (poItemsForGL.length > 0) {
        const totalForGL = poItemsForGL.reduce((sum, i) => sum + (i.totalAmount || i.amount), 0);
        return { ...budget, consumedAmount: budget.consumedAmount + totalForGL };
      }
      return budget;
    }));
  };

  const handleCreateGRN = () => {
    if (!selectedPO) return;
    const newGRN: GRN = {
      ...grnForm as GRN,
      id: `GRN-${Math.floor(Math.random() * 10000)}`,
      entityName: selectedPO.entityName,
      purchaseOrderId: selectedPO.id,
      status: 'Pending',
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      attachments: grnForm.attachments || []
    };
    setGrns([...grns, newGRN]);
    setShowForm(false);
    resetForms();
  };

  const handleCreateInvoice = () => {
    if (!selectedGRN) return;
    const newInvoice: Invoice = {
      ...invoiceForm as Invoice,
      id: `INV-${Math.floor(Math.random() * 10000)}`,
      entityName: selectedGRN.entityName,
      grnId: selectedGRN.id,
      status: 'Pending',
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
      attachments: invoiceForm.attachments || []
    };
    setInvoices([...invoices, newInvoice]);
    setShowForm(false);
    resetForms();
  };

  const resetForms = () => {
    setPoForm({
      entityName: masters.Entity?.[0]?.name || '',
      vendorId: '', vendorSiteId: '', transactionType: 'Material', validFrom: '', validTo: '',
      frequency: 'One-Time', department: '', subDepartment: '', paymentTerms: '',
      centerNames: [], items: [{ id: Math.random().toString(), itemName: '', quantity: 1, rate: 0, amount: 0, remarks: '', coaCode: '' }],
      tds: 0, gst: 0, amount: 0, remarks: '', attachments: [],
      shippingAddressId: '', billingAddressId: '',
      isUnbudgeted: false, unbudgetedJustification: ''
    });
    setGrnForm({ vendorSiteId: '', location: '', invoiceNumber: '', items: [], amount: 0, remarks: '', attachments: [], shippingAddressId: '', billingAddressId: '' });
    setInvoiceForm({ vendorSiteId: '', location: '', attachments: [], shippingAddressId: '', billingAddressId: '' });
    setSelectedPO(null);
    setSelectedGRN(null);
  };

  const poGrns = grns.filter(g => g.purchaseOrderId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, source: Attachment['source']) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAttachment: Attachment = {
      id: `att-${Math.random()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      source
    };

    if (source === 'PO') setPoForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
    if (source === 'GRN') setGrnForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
    if (source === 'Invoice') setInvoiceForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAttachment] }));
    
    // Reset input
    e.target.value = '';
  };

  const canApprove = (doc: PurchaseOrder | GRN | Invoice) => {
    if (doc.status !== 'Pending') return false;
    
    let moduleType: ModuleType;
    if ('grnId' in doc) {
      moduleType = ModuleType.INVOICE_GRN;
    } else if ('purchaseOrderId' in doc) {
      moduleType = ModuleType.GRN;
    } else {
      moduleType = ModuleType.PO;
    }

    const rule = workflows.find(w => 
      w.entityName === doc.entityName &&
      w.moduleType === moduleType &&
      w.subDepartment === doc.subDepartment &&
      (!w.centerName || (doc as any).centerNames?.includes(w.centerName) || (doc as any).location === w.centerName) &&
      Number(doc.amount) >= Number(w.minAmount) && 
      (w.maxAmount == null || Number(doc.amount) <= Number(w.maxAmount))
    );

    if (!rule) {
      // Only auto-approve if NO workflow rules exist at all for this module type
      // If rules exist but none match this document, block approval (prevents silent bypass)
      const anyRuleForModule = workflows.some(w => w.moduleType === moduleType);
      return !anyRuleForModule;
    }
    if (rule.approvalChain.length === 0) return true;

    const currentStep = rule.approvalChain[doc.currentStepIndex];
    if (!currentStep) return false;

    return currentStep.type === ApprovalType.APPROVER && currentStep.userIds.includes(currentUser.id);
  };

  const canCompleteReview = (doc: PurchaseOrder | GRN | Invoice) => {
    if (doc.status !== 'Pending') return false;
    let moduleType: ModuleType;
    if ('grnId' in doc) {
      moduleType = ModuleType.INVOICE_GRN;
    } else if ('purchaseOrderId' in doc) {
      moduleType = ModuleType.GRN;
    } else {
      moduleType = ModuleType.PO;
    }
    const rule = workflows.find(w =>
      w.entityName === doc.entityName &&
      w.moduleType === moduleType &&
      w.subDepartment === doc.subDepartment &&
      (!w.centerName || (doc as any).centerNames?.includes(w.centerName) || (doc as any).location === w.centerName) &&
      Number(doc.amount) >= Number(w.minAmount) &&
      (w.maxAmount == null || Number(doc.amount) <= Number(w.maxAmount))
    );
    if (!rule || rule.approvalChain.length === 0) return false;
    const currentStep = rule.approvalChain[doc.currentStepIndex];
    if (!currentStep) return false;
    return currentStep.type === ApprovalType.REVIEWER && currentStep.userIds.includes(currentUser.id);
  };

  const completeReviewPO = (id: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id !== id) return po;
      const rule = workflows.find(w =>
        w.entityName === po.entityName &&
        w.moduleType === ModuleType.PO &&
        w.subDepartment === po.subDepartment &&
        (!w.centerName || po.centerNames?.includes(w.centerName)) &&
        Number(po.amount) >= Number(w.minAmount) &&
        (w.maxAmount == null || Number(po.amount) <= Number(w.maxAmount))
      );
      if (!rule || po.currentStepIndex >= rule.approvalChain.length - 1) return po;
      return { ...po, currentStepIndex: po.currentStepIndex + 1 };
    }));
  };

  const completeReviewGRN = (id: string) => {
    setGrns(prev => prev.map(grn => {
      if (grn.id !== id) return grn;
      const rule = workflows.find(w =>
        w.entityName === grn.entityName &&
        w.moduleType === ModuleType.GRN &&
        w.subDepartment === grn.subDepartment &&
        (!w.centerName || grn.location === w.centerName) &&
        Number(grn.amount) >= Number(w.minAmount) &&
        (w.maxAmount == null || Number(grn.amount) <= Number(w.maxAmount))
      );
      if (!rule || grn.currentStepIndex >= rule.approvalChain.length - 1) return grn;
      return { ...grn, currentStepIndex: grn.currentStepIndex + 1 };
    }));
  };

  const completeReviewInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const rule = workflows.find(w =>
        w.entityName === inv.entityName &&
        w.moduleType === ModuleType.INVOICE_GRN &&
        w.subDepartment === inv.subDepartment &&
        (!w.centerName || inv.location === w.centerName) &&
        Number(inv.amount) >= Number(w.minAmount) &&
        (w.maxAmount == null || Number(inv.amount) <= Number(w.maxAmount))
      );
      if (!rule || inv.currentStepIndex >= rule.approvalChain.length - 1) return inv;
      return { ...inv, currentStepIndex: inv.currentStepIndex + 1 };
    }));
  };

  const approvePO = (id: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id !== id) return po;

      const rule = workflows.find(w => 
        w.entityName === po.entityName &&
        w.moduleType === ModuleType.PO &&
        w.subDepartment === po.subDepartment &&
        (!w.centerName || po.centerNames?.includes(w.centerName)) &&
        Number(po.amount) >= Number(w.minAmount) && 
        (w.maxAmount == null || Number(po.amount) <= Number(w.maxAmount))
      );

      if (!rule || po.currentStepIndex >= rule.approvalChain.length - 1) {
        // Final budget check before approval
        const budgetCheck = checkBudget(po);
        if (!budgetCheck.ok) {
          alert(`Cannot approve PO: ${budgetCheck.errors?.join('\n')}`);
          return { ...po, status: 'Budget Hold' };
        }
        deductBudget(po);
        return { ...po, status: 'Approved' };
      }

      return { ...po, currentStepIndex: po.currentStepIndex + 1 };
    }));
  };

  const creditBudget = (po: PurchaseOrder) => {
    if (po.isUnbudgeted) return;

    setBudgets(prev => prev.map(budget => {
      const poItemsForGL = po.items.filter(i => i.coaCode === budget.coaCode);
      if (poItemsForGL.length > 0) {
        const totalForGL = poItemsForGL.reduce((sum, i) => sum + (i.totalAmount || i.amount), 0);
        return { ...budget, consumedAmount: budget.consumedAmount - totalForGL };
      }
      return budget;
    }));
  };

  const amendPO = (id: string) => {
    const po = purchaseOrders.find(p => p.id === id);
    if (po && po.status === 'Approved') {
      creditBudget(po);
    }
    setPurchaseOrders(purchaseOrders.map(po => po.id === id ? { ...po, status: 'Pending', currentStepIndex: 0 } : po));
    alert('PO status reset to Pending for amendment. Budget has been credited back and will be re-validated upon re-approval.');
  };

  const approveGRN = (id: string) => {
    setGrns(prev => prev.map(grn => {
      if (grn.id !== id) return grn;

      const rule = workflows.find(w => 
        w.entityName === grn.entityName &&
        w.moduleType === ModuleType.GRN &&
        w.subDepartment === grn.subDepartment &&
        (!w.centerName || grn.location === w.centerName) &&
        Number(grn.amount) >= Number(w.minAmount) && 
        (w.maxAmount == null || Number(grn.amount) <= Number(w.maxAmount))
      );

      if (!rule || grn.currentStepIndex >= rule.approvalChain.length - 1) {
        return { ...grn, status: 'Approved' };
      }

      return { ...grn, currentStepIndex: grn.currentStepIndex + 1 };
    }));
  };

  const reverseGRN = (id: string) => {
    setGrns(grns.map(grn => grn.id === id ? { ...grn, status: 'Reversed' } : grn));
    alert('GRN reversed. You can now recreate it against the same PO.');
  };

  const approveInvoice = (id: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;

      const rule = workflows.find(w => 
        w.entityName === inv.entityName &&
        w.moduleType === ModuleType.INVOICE_GRN &&
        w.subDepartment === inv.subDepartment &&
        (!w.centerName || inv.location === w.centerName) &&
        Number(inv.amount) >= Number(w.minAmount) && 
        (w.maxAmount == null || Number(inv.amount) <= Number(w.maxAmount))
      );

      if (!rule || inv.currentStepIndex >= rule.approvalChain.length - 1) {
        return { ...inv, status: 'Approved' };
      }

      return { ...inv, currentStepIndex: inv.currentStepIndex + 1 };
    }));
  };

  const reverseInvoice = (id: string) => {
    setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'Reversed' } : inv));
    alert('Invoice reversed. You can now recreate it against the same GRN.');
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-slate-200 pb-4">
        {(['PO', 'GRN', 'Invoice'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setShowForm(false); }}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {mode === 'PO' ? 'Purchase Orders' : mode === 'GRN' ? 'GRN' : 'Invoices'}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-800">
          {viewMode === 'PO' ? 'Purchase Order Management' : viewMode === 'GRN' ? 'Goods Receipt Notes' : 'Invoice Processing'}
        </h2>
        {viewMode === 'PO' && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black shadow-lg shadow-indigo-200 hover:scale-105 transition-transform"
          >
            + Create New PO
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900">
              {selectedPO ? (selectedGRN ? 'Create Invoice' : 'Create GRN') : 'New Purchase Order'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForms(); }} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PO Form Fields */}
            {!selectedPO && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Entity</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.entityName}
                    onChange={e => setPoForm({ ...poForm, entityName: e.target.value })}
                  >
                    {masters.Entity.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Vendor</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.vendorId}
                    onChange={e => setPoForm({ ...poForm, vendorId: e.target.value, vendorSiteId: '' })}
                  >
                    <option value="">Select Vendor</option>
                    {masters.Vendor.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Vendor Site</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.vendorSiteId}
                    onChange={e => setPoForm({ ...poForm, vendorSiteId: e.target.value })}
                    disabled={!poForm.vendorId}
                  >
                    <option value="">Select Vendor Site</option>
                    {masters['Vendor Site']?.filter(s => s.vendorId === poForm.vendorId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Shipping Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.shippingAddressId}
                    onChange={e => setPoForm({ ...poForm, shippingAddressId: e.target.value })}
                  >
                    <option value="">Select Shipping Address</option>
                    {masters.Entity.flatMap(ent => ent.shippingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Billing Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.billingAddressId}
                    onChange={e => setPoForm({ ...poForm, billingAddressId: e.target.value })}
                  >
                    <option value="">Select Billing Address</option>
                    {masters.Entity.flatMap(ent => ent.billingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">TDS %</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.tds}
                    onChange={e => setPoForm({ ...poForm, tds: Number(e.target.value) })}
                  >
                    <option value="0">Select TDS</option>
                    {masters.TDS.map(t => <option key={t.id} value={t.rate}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">GST %</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.gst}
                    onChange={e => setPoForm({ ...poForm, gst: Number(e.target.value) })}
                  >
                    <option value="0">Select GST</option>
                    {masters.GST.map(g => <option key={g.id} value={g.rate}>{g.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Transaction Type</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.transactionType}
                    onChange={e => setPoForm({ ...poForm, transactionType: e.target.value as TransactionType })}
                  >
                    <option value="Material">Material</option>
                    <option value="Service">Service</option>
                    <option value="Asset">Asset</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Validity From</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.validFrom}
                    onChange={e => setPoForm({ ...poForm, validFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Validity To</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.validTo}
                    onChange={e => setPoForm({ ...poForm, validTo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Required Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.requiredDate || ''}
                    onChange={e => setPoForm({ ...poForm, requiredDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Frequency</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.frequency}
                    onChange={e => setPoForm({ ...poForm, frequency: e.target.value as Frequency })}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-Time">One-Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Department</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.department}
                    onChange={e => setPoForm({ ...poForm, department: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Sub-Department</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.subDepartment}
                    onChange={e => setPoForm({ ...poForm, subDepartment: e.target.value })}
                  >
                    <option value="">Select Sub-Department</option>
                    {poForm.department && DEPT_SUBDEPT_MAP[poForm.department as keyof typeof DEPT_SUBDEPT_MAP]?.map(sd => <option key={sd} value={sd}>{sd}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Payment Terms</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.paymentTerms}
                    onChange={e => setPoForm({ ...poForm, paymentTerms: e.target.value })}
                  >
                    <option value="">Select Payment Terms</option>
                    {masters['Payment Terms']?.map(pt => (
                      <option key={pt.id} value={pt.name}>{pt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Terms & Conditions</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.termsAndConditionsId}
                    onChange={e => setPoForm({ ...poForm, termsAndConditionsId: e.target.value })}
                  >
                    <option value="">Select Terms & Conditions</option>
                    {masters['Terms & Conditions']?.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4 col-span-2 bg-amber-50 p-6 rounded-3xl border border-amber-100">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="isUnbudgeted"
                      className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                      checked={poForm.isUnbudgeted || false}
                      onChange={e => setPoForm({ ...poForm, isUnbudgeted: e.target.checked })}
                    />
                    <label htmlFor="isUnbudgeted" className="text-sm font-black text-amber-900 uppercase tracking-wider cursor-pointer">Unbudgeted Expense</label>
                  </div>
                  {poForm.isUnbudgeted && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-xs font-black text-amber-700 uppercase tracking-wider">Justification (Mandatory)</label>
                      <textarea 
                        className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm"
                        placeholder="Provide justification for emergency/unplanned spend..."
                        value={poForm.unbudgetedJustification || ''}
                        onChange={e => setPoForm({ ...poForm, unbudgetedJustification: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4 col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      id="isAdvancePO"
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      checked={poForm.isAdvancePO || false}
                      onChange={e => setPoForm({ ...poForm, isAdvancePO: e.target.checked })}
                    />
                    <label htmlFor="isAdvancePO" className="text-sm font-black text-slate-700 uppercase tracking-wider cursor-pointer">Advance PO</label>
                  </div>
                  {poForm.isAdvancePO && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Advance Percentage (%)</label>
                      <input 
                        type="number" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        placeholder="e.g. 10"
                        value={poForm.advancePercentage || ''}
                        onChange={e => setPoForm({ ...poForm, advancePercentage: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <MultiSelect 
                    label="Centers"
                    options={CENTERS}
                    selected={poForm.centerNames || []}
                    onChange={centers => setPoForm({ ...poForm, centerNames: centers })}
                  />
                </div>
                
                {/* Items Section */}
                <div className="col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Items</h4>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => downloadTemplate('PO')}
                        className="text-indigo-600 text-xs font-black hover:underline flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                      </button>
                      <label className="cursor-pointer text-indigo-600 text-xs font-black hover:underline flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Bulk Upload
                        <input type="file" className="hidden" onChange={e => handleBulkUpload(e, 'PO')} />
                      </label>
                      <button 
                        onClick={addItem}
                        className="text-indigo-600 text-xs font-black hover:underline"
                      >
                        + Add Item
                      </button>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {poForm.items?.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="grid grid-cols-12 gap-4 items-end">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              value={item.itemName}
                              onChange={e => updateItem(item.id, 'itemName', e.target.value)}
                            >
                              <option value="">Select Item</option>
                              {masters.Item.filter(i => !poForm.items?.some(selected => selected.id !== item.id && selected.itemName === i.name)).map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GL Code</label>
                            <select 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              value={item.coaCode}
                              onChange={e => updateItem(item.id, 'coaCode', e.target.value)}
                            >
                              <option value="">Select GL</option>
                              {masters.COA.map(coa => <option key={coa.id} value={coa.code}>{coa.code}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (INR)</label>
                            <input 
                              type="number"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              value={item.rate}
                              onChange={e => updateItem(item.id, 'rate', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</label>
                            <input 
                              type="number"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              value={item.quantity}
                              onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Amount</label>
                            <input 
                              type="number"
                              readOnly
                              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-slate-600"
                              value={item.amount?.toFixed(2)}
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              placeholder="Remarks"
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                              value={item.remarks}
                              onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                            />
                          </div>
                          <div className="col-span-1 flex justify-center pb-1">
                            {poForm.items!.length > 1 && (
                              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-xl">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Consolidated Summary Section */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mt-6 space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Tax & Amount Summary (INR)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Base Amount</label>
                        <div className="text-sm font-bold text-slate-700">
                          ₹{(poForm.items || []).reduce((sum, i) => sum + (i.amount || 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total TDS Amount</label>
                        <div className="text-sm font-bold text-red-500">
                          -₹{(poForm.items || []).reduce((sum, i) => sum + (i.tdsAmount || 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total GST Amount</label>
                        <div className="text-sm font-bold text-emerald-500">
                          +₹{(poForm.items || []).reduce((sum, i) => sum + (i.gstAmount || 0), 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Net Total Amount</label>
                        <div className="text-lg font-black text-indigo-700">
                          ₹{poForm.amount?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/50">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total CGST</label>
                        <div className="text-xs font-bold text-slate-600">₹{(poForm.items || []).reduce((sum, i) => sum + (i.cgst || 0), 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total SGST</label>
                        <div className="text-xs font-bold text-slate-600">₹{(poForm.items || []).reduce((sum, i) => sum + (i.sgst || 0), 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total IGST</label>
                        <div className="text-xs font-bold text-slate-600">₹{(poForm.items || []).reduce((sum, i) => sum + (i.igst || 0), 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Remarks</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={poForm.remarks}
                    onChange={e => setPoForm({ ...poForm, remarks: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* GRN Form Fields */}
            {selectedPO && !selectedGRN && (
              <>
                <div className="col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
                  <p className="text-sm font-bold text-indigo-900">Auto-populated from {selectedPO.id}</p>
                  <div className="mt-2 space-y-1">
                    <div className="text-xs"><span className="text-indigo-400 uppercase font-black">Entity:</span> {masters.Entity.find(e => e.id === selectedPO.entityId)?.name}</div>
                    <div className="text-xs"><span className="text-indigo-400 uppercase font-black">Vendor:</span> {masters.Vendor.find(v => v.id === selectedPO.vendorId)?.name}</div>
                    <div className="text-xs"><span className="text-indigo-400 uppercase font-black">Vendor Site:</span> {masters['Vendor Site']?.find(s => s.id === selectedPO.vendorSiteId)?.name || 'N/A'}</div>
                    <div className="text-xs"><span className="text-indigo-400 uppercase font-black">Centers:</span> {(selectedPO.centerNames || []).join(', ')}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Vendor Site</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={grnForm.vendorSiteId}
                    onChange={e => setGrnForm({ ...grnForm, vendorSiteId: e.target.value })}
                  >
                    <option value="">Select Vendor Site</option>
                    {masters['Vendor Site']?.filter(s => s.vendorId === selectedPO.vendorId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Shipping Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={grnForm.shippingAddressId}
                    onChange={e => setGrnForm({ ...grnForm, shippingAddressId: e.target.value })}
                  >
                    <option value="">Select Shipping Address</option>
                    {masters.Entity.flatMap(ent => ent.shippingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Billing Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={grnForm.billingAddressId}
                    onChange={e => setGrnForm({ ...grnForm, billingAddressId: e.target.value })}
                  >
                    <option value="">Select Billing Address</option>
                    {masters.Entity.flatMap(ent => ent.billingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Location</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={grnForm.location}
                    onChange={e => setGrnForm({ ...grnForm, location: e.target.value })}
                  >
                    <option value="">Select Location</option>
                    {(selectedPO.centerNames || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Invoice Number</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={grnForm.invoiceNumber}
                    onChange={e => setGrnForm({ ...grnForm, invoiceNumber: e.target.value })}
                  />
                </div>
                
                <div className="col-span-2 space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">GRN Items</h4>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => downloadTemplate('GRN')}
                        className="text-indigo-600 text-xs font-black hover:underline flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                      </button>
                      <label className="cursor-pointer text-indigo-600 text-xs font-black hover:underline flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Bulk Upload
                        <input type="file" className="hidden" onChange={e => handleBulkUpload(e, 'GRN')} />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(selectedPO.items || []).map((poItem) => {
                      const grnItem = grnForm.items?.find(i => i.id === poItem.id) || { ...poItem, quantity: 0, amount: 0 };
                      return (
                        <div key={poItem.id} className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="col-span-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Item</label>
                            <div className="text-sm font-bold text-slate-700">{poItem.itemName}</div>
                            <div className="text-[10px] text-indigo-500 font-black">PO Rate: ₹{poItem.rate} | TDS: {poItem.tds}% | GST: {poItem.gst}% | PO Qty: {poItem.quantity}</div>
                            <div className="text-[10px] text-slate-500 italic mt-1 font-bold">PO Remarks: {poItem.remarks}</div>
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Qty Received</label>
                            <input 
                              type="number"
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${grnItem.quantity > poItem.quantity ? 'border-red-500' : 'border-slate-200'}`}
                              value={grnItem.quantity}
                              onChange={e => {
                                const qty = Number(e.target.value);
                                if (qty > poItem.quantity) {
                                  alert(`Quantity received (${qty}) cannot be greater than PO quantity (${poItem.quantity})`);
                                  return;
                                }
                                const updatedItems = [...(grnForm.items || [])];
                                const index = updatedItems.findIndex(i => i.id === poItem.id);
                                
                                const base = qty * poItem.rate;
                                const tdsAmount = base * ((poItem.tds || 0) / 100);
                                const gstAmount = base * ((poItem.gst || 0) / 100);
                                const totalAmount = base + gstAmount - tdsAmount;
                                
                                const newItem: ItemLine = { 
                                  ...poItem, 
                                  quantity: qty, 
                                  amount: base,
                                  tdsAmount,
                                  gstAmount,
                                  totalAmount
                                };
                                if (index > -1) updatedItems[index] = newItem;
                                else updatedItems.push(newItem);
                                
                                const total = updatedItems.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
                                setGrnForm({ ...grnForm, items: updatedItems, amount: total });
                              }}
                            />
                            {grnItem.quantity > poItem.quantity && <div className="text-[8px] text-red-500 font-bold uppercase">Exceeds PO Qty</div>}
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Total Amount (INR)</label>
                            <input 
                              type="number"
                              readOnly
                              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-indigo-600"
                              value={grnItem.totalAmount?.toFixed(2)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Invoice Form Fields */}
            {selectedGRN && (
              <>
                <div className="col-span-2 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4">
                  <p className="text-sm font-bold text-emerald-900">Auto-populated from {selectedGRN.id}</p>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                    <div><span className="text-emerald-400 uppercase">Invoice #:</span> {selectedGRN.invoiceNumber}</div>
                    <div><span className="text-emerald-400 uppercase">Qty:</span> {selectedGRN.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</div>
                    <div><span className="text-emerald-400 uppercase">Amount:</span> ₹{(Number(selectedGRN.amount) || 0).toFixed(2)}</div>
                    <div><span className="text-emerald-400 uppercase">Vendor Site:</span> {masters['Vendor Site']?.find(s => s.id === selectedGRN.vendorSiteId)?.name || 'N/A'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Vendor Site</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={invoiceForm.vendorSiteId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, vendorSiteId: e.target.value })}
                  >
                    <option value="">Select Vendor Site</option>
                    {masters['Vendor Site']?.filter(s => s.vendorId === selectedPO.vendorId).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Shipping Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={invoiceForm.shippingAddressId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, shippingAddressId: e.target.value })}
                  >
                    <option value="">Select Shipping Address</option>
                    {masters.Entity.flatMap(ent => ent.shippingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Billing Address</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={invoiceForm.billingAddressId}
                    onChange={e => setInvoiceForm({ ...invoiceForm, billingAddressId: e.target.value })}
                  >
                    <option value="">Select Billing Address</option>
                    {masters.Entity.flatMap(ent => ent.billingAddresses || []).map((addr: any) => (
                      <option key={addr.id} value={addr.id}>{addr.address}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Invoice Location</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    value={invoiceForm.location}
                    onChange={e => setInvoiceForm({ ...invoiceForm, location: e.target.value })}
                  >
                    <option value="">Select Location</option>
                    {CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="col-span-2 space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Invoice Items</h4>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => downloadTemplate('Invoice')}
                        className="text-indigo-600 text-xs font-black hover:underline flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                      </button>
                      <label className="cursor-pointer text-indigo-600 text-xs font-black hover:underline flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Bulk Upload
                        <input type="file" className="hidden" onChange={e => handleBulkUpload(e, 'Invoice')} />
                      </label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedGRN.items.map((grnItem) => {
                      const invItem = invoiceForm.items?.find(i => i.id === grnItem.id) || { ...grnItem, quantity: grnItem.quantity };
                      return (
                        <div key={grnItem.id} className="grid grid-cols-12 gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="col-span-6">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Item</label>
                            <div className="text-sm font-bold text-slate-700">{grnItem.itemName}</div>
                            <div className="text-[10px] text-emerald-500 font-black">GRN Qty: {grnItem.quantity} | Rate: ₹{grnItem.rate}</div>
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Invoice Qty</label>
                            <input 
                              type="number"
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${invItem.quantity > grnItem.quantity ? 'border-red-500' : 'border-slate-200'}`}
                              value={invItem.quantity}
                              onChange={e => {
                                const qty = Number(e.target.value);
                                if (qty > grnItem.quantity) {
                                  alert(`Invoice quantity (${qty}) cannot be greater than GRN quantity (${grnItem.quantity})`);
                                  return;
                                }
                                const updatedItems = [...(invoiceForm.items || [])];
                                const index = updatedItems.findIndex(i => i.id === grnItem.id);
                                
                                const base = qty * grnItem.rate;
                                const tdsAmount = base * ((grnItem.tds || 0) / 100);
                                const gstAmount = base * ((grnItem.gst || 0) / 100);
                                const totalAmount = base + gstAmount - tdsAmount;
                                
                                const newItem: ItemLine = { 
                                  ...grnItem, 
                                  quantity: qty, 
                                  amount: base,
                                  tdsAmount,
                                  gstAmount,
                                  totalAmount
                                };
                                if (index > -1) updatedItems[index] = newItem;
                                else updatedItems.push(newItem);
                                
                                setInvoiceForm({ ...invoiceForm, items: updatedItems });
                              }}
                            />
                            {invItem.quantity > grnItem.quantity && <div className="text-[8px] text-red-500 font-bold uppercase">Exceeds GRN Qty</div>}
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Amount (INR)</label>
                            <div className="text-sm font-black text-emerald-600">₹{invItem.totalAmount?.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Document Upload Section */}
            <div className="col-span-2 border-t border-slate-100 pt-6 mt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Supporting Documents</h4>
                <label className="cursor-pointer">
                  <span className="text-indigo-600 text-xs font-black hover:underline">+ Upload File</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, selectedPO ? (selectedGRN ? 'Invoice' : 'GRN') : 'PO')}
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                {/* Show inherited documents */}
                {selectedPO && selectedPO.attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-600">{att.name} <span className="text-[10px] text-indigo-400 font-black uppercase ml-2">From PO</span></span>
                    </div>
                  </div>
                ))}
                {selectedGRN && selectedGRN.attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-600">{att.name} <span className="text-[10px] text-emerald-400 font-black uppercase ml-2">From GRN</span></span>
                    </div>
                  </div>
                ))}
                {/* Show current form documents */}
                {(selectedPO ? (selectedGRN ? invoiceForm : grnForm) : poForm).attachments?.map(att => (
                  <div key={att.id} className="flex items-center justify-between bg-white p-3 rounded-xl border-2 border-indigo-100 border-dashed">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-600 p-2 rounded-lg text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{att.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-4">
            <button 
              onClick={() => { setShowForm(false); resetForms(); }}
              className="px-6 py-3 rounded-xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={selectedPO ? (selectedGRN ? handleCreateInvoice : handleCreateGRN) : handleCreatePO}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 hover:scale-105 transition-transform"
            >
              Submit for Approval
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID / Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Required Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {viewMode === 'PO' && purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-900">{po.id}</div>
                    <div className="text-[10px] text-slate-400 font-bold">{new Date(po.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{masters.Vendor.find(v => v.id === po.vendorId)?.name}</div>
                    <div className="text-xs text-slate-500">{po.items.length} Items • {po.centerNames.length} Centers • ₹{(Number(po.amount) || 0).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{po.requiredDate || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                        po.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                        po.status === 'Budget Hold' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {po.status}
                      </span>
                      {po.status === 'Pending' && (
                        <div className="text-[10px] font-bold text-slate-400">
                          Step {po.currentStepIndex + 1}
                        </div>
                      )}
                      {po.isUnbudgeted && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase border border-amber-200 rounded w-fit">
                          Unbudgeted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        {canCompleteReview(po) && (
                          <button onClick={() => completeReviewPO(po.id)} className="text-xs font-black text-amber-600 hover:underline">Complete Review</button>
                        )}
                        {canApprove(po) && (
                          <button onClick={() => approvePO(po.id)} className="text-xs font-black text-emerald-600 hover:underline">Approve</button>
                        )}
                        {po.status === 'Approved' && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedPO(po);
                                setGrnForm({
                                  entityName: po.entityName,
                                  purchaseOrderId: po.id,
                                  vendorSiteId: po.vendorSiteId || '',
                                  shippingAddressId: po.shippingAddressId || '',
                                  billingAddressId: po.billingAddressId || '',
                                  location: (po.centerNames && po.centerNames[0]) || '',
                                  department: po.department || '',
                                  subDepartment: po.subDepartment || '',
                                  remarks: po.remarks || '',
                                  invoiceNumber: '',
                                  items: (po.items || []).map(item => ({ ...item, quantity: 0, amount: 0 })),
                                  amount: 0,
                                  attachments: []
                                });
                                setShowForm(true);
                              }}
                              className="text-xs font-black text-indigo-600 hover:underline"
                            >
                              Create GRN
                            </button>
                            <button 
                              onClick={() => amendPO(po.id)}
                              className="text-xs font-black text-slate-600 hover:underline"
                            >
                              Amend
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Budget Visibility during Approval */}
                      {po.status === 'Pending' && !po.isUnbudgeted && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1 mt-1">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Budget Check</div>
                          {po.items.map((item, idx) => {
                            const budget = budgets.find(b => b.coaCode === item.coaCode);
                            if (!budget) return null;
                            const balance = budget.amount - budget.consumedAmount;
                            const isExceeded = (item.totalAmount || item.amount) > balance;
                            return (
                              <div key={idx} className="flex justify-between items-center text-[9px]">
                                <span className="font-bold text-slate-600">{item.coaCode}:</span>
                                <span className={`font-black ${isExceeded ? 'text-rose-500' : 'text-emerald-600'}`}>
                                  Bal: ₹{balance.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {viewMode === 'GRN' && poGrns.map(grn => {
                const po = purchaseOrders.find(p => p.id === grn.purchaseOrderId);
                return (
                  <tr key={grn.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-slate-900">{grn.id}</div>
                      <div className="text-[10px] text-slate-400 font-bold">Against {grn.purchaseOrderId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-700">{grn.location}</div>
                      <div className="text-xs text-slate-500">Inv: {grn.invoiceNumber} • {grn.items.length} Items • Total: ₹{(Number(grn.amount) || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                          grn.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {grn.status}
                        </span>
                        {grn.status === 'Pending' && (
                          <div className="text-[10px] font-bold text-slate-400">
                            Step {grn.currentStepIndex + 1}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {canCompleteReview(grn) && (
                          <button onClick={() => completeReviewGRN(grn.id)} className="text-xs font-black text-amber-600 hover:underline">Complete Review</button>
                        )}
                        {canApprove(grn) && (
                          <button onClick={() => approveGRN(grn.id)} className="text-xs font-black text-emerald-600 hover:underline">Approve</button>
                        )}
                        {grn.status === 'Approved' && (
                          <>
                            <button 
                              onClick={() => { 
                                setSelectedPO(po || null); 
                                setSelectedGRN(grn); 
                                setShowForm(true); 
                              }}
                              className="text-xs font-black text-indigo-600 hover:underline"
                            >
                              Create Invoice
                            </button>
                            <button 
                              onClick={() => reverseGRN(grn.id)}
                              className="text-xs font-black text-rose-600 hover:underline"
                            >
                              Reverse
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {viewMode === 'Invoice' && invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-900">{inv.id}</div>
                    <div className="text-[10px] text-slate-400 font-bold">Against {inv.grnId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{inv.location}</div>
                    <div className="text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit ${
                        inv.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                      {inv.status === 'Pending' && (
                        <div className="text-[10px] font-bold text-slate-400">
                          Step {inv.currentStepIndex + 1}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {canCompleteReview(inv) && (
                        <button onClick={() => completeReviewInvoice(inv.id)} className="text-xs font-black text-amber-600 hover:underline">Complete Review</button>
                      )}
                      {canApprove(inv) && (
                        <button onClick={() => approveInvoice(inv.id)} className="text-xs font-black text-emerald-600 hover:underline">Approve</button>
                      )}
                      {inv.status === 'Approved' && (
                        <button 
                          onClick={() => reverseInvoice(inv.id)}
                          className="text-xs font-black text-rose-600 hover:underline"
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {((viewMode === 'PO' && purchaseOrders.length === 0) || 
                (viewMode === 'GRN' && poGrns.length === 0) || 
                (viewMode === 'Invoice' && invoices.length === 0)) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No records found for {viewMode}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderModule;
