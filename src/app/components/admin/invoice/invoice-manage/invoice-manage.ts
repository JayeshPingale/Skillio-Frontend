// src/app/components/admin/invoices/invoice-manage/invoice-manage.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceService, InvoiceDTO, UpdateInvoiceDTO } from '../../../../core/services/Invoice/invoice.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';

// ❌ REMOVE: CreateInvoiceDTO import (generate mode gone)
// ❌ REMOVE: PaymentDTO, PaymentService import (ab zaroori nahi)

@Component({
  selector: 'app-invoice-manage',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './invoice-manage.html',
  styleUrls: ['./invoice-manage.css']
})
export class InvoiceManageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private invoiceService = inject(InvoiceService);
  // ❌ REMOVE: private paymentService = inject(PaymentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  invoiceForm!: FormGroup;
  // ❌ REMOVE: payments = signal<PaymentDTO[]>([]);

  // ✅ KEEP: ye sab same hai
  isEditMode = signal(false);
  invoiceId = signal<number | null>(null);
  currentInvoice = signal<InvoiceDTO | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // ✅ UPDATED: Sirf Edit mode hai ab
  pageTitle = computed(() => 'Edit Invoice');
  pageSubtitle = computed(() => 'Update PDF path and remarks for this invoice');

  ngOnInit(): void {
    this.initializeForm();
    this.checkMode();
    // ❌ REMOVE: if (!this.isEditMode()) { this.loadPayments(); }
  }

  private checkMode(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEditMode.set(true);
      this.invoiceId.set(Number(id));
      this.loadInvoiceData(Number(id));
    } else {
      // ✅ Koi /generate pe aaye directly toh list pe wapas bhejo
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }

  private initializeForm(): void {
    // ✅ ONLY Edit form — sirf pdfPath aur remarks
    this.invoiceForm = this.fb.group({
      pdfPath: ['', [Validators.maxLength(500)]],
      remarks: ['', [Validators.maxLength(500)]]
    });
    // ❌ REMOVE: Generate mode form (paymentId field)
  }

  // ❌ REMOVE: private loadPayments(): void { ... }

  private loadInvoiceData(id: number): void {
    this.isLoading.set(true);

    this.invoiceService.getInvoiceById(id).subscribe({
      next: (data: InvoiceDTO) => {
        this.currentInvoice.set(data);
        this.invoiceForm.patchValue({
          pdfPath: data.pdfPath || '',
          remarks: data.remarks || ''
        });
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading invoice:', error);
        this.errorMessage.set('Failed to load invoice data');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly');
      return;
    }
    // ✅ ONLY updateInvoice() — generateInvoice() hata diya
    this.updateInvoice();
  }

  // ❌ REMOVE: private generateInvoice(): void { ... }

  private updateInvoice(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const request: UpdateInvoiceDTO = {
      pdfPath: this.invoiceForm.get('pdfPath')?.value || undefined,
      remarks: this.invoiceForm.get('remarks')?.value || undefined
    };

    this.invoiceService.updateInvoice(this.invoiceId()!, request).subscribe({
      next: (response: InvoiceDTO) => {
        console.log('Invoice updated:', response);
        this.successMessage.set('Invoice updated successfully!');
        setTimeout(() => {
          // ✅ UPDATED: Relative navigation — both admin & sales dashboard ke liye kaam karega
          this.router.navigate(['../'], { relativeTo: this.route });
        }, 1500);
      },
      error: (error: any) => {
        console.error('Error updating invoice:', error);
        this.errorMessage.set(
          error.error?.message || 'Failed to update invoice. Please try again.'
        );
        this.isSubmitting.set(false);
      }
    });
  }

  cancel(): void {
    // ✅ UPDATED: Relative navigation
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
