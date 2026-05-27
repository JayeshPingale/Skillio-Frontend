// src/app/components/admin/invoices/invoice-list/invoice-list.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // ✅ Add ActivatedRoute
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { InvoiceService, InvoiceDTO } from '../../../../core/services/Invoice/invoice.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { ConfirmationDialogComponent } from '../../../confirmation-dialog/confirmation-dialog-component/confirmation-dialog-component';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmationDialogComponent],
  templateUrl: './invoice-list.html',
  styleUrls: ['./invoice-list.css']
})
export class InvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // ✅ ADD
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  
  isAdmin = signal(false);
  isSalesExec = signal(false);
  invoices = signal<InvoiceDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedFilter = signal('ALL');
  currentPage = signal(1);
  itemsPerPage = signal(15);
  public Math = Math;

  filterOptions = ['ALL', 'PENDING_EMAIL', 'PENDING_WHATSAPP', 'SENT'];

  // Filtered invoices
  filteredInvoices = computed(() => {
    let filtered = this.invoices();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.studentName?.toLowerCase().includes(term) ||
        inv.studentEmail?.toLowerCase().includes(term) ||
        inv.studentCode?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.selectedFilter() !== 'ALL') {
      if (this.selectedFilter() === 'PENDING_EMAIL') {
        filtered = filtered.filter(inv => !inv.sentToEmail);
      } else if (this.selectedFilter() === 'PENDING_WHATSAPP') {
        filtered = filtered.filter(inv => !inv.sentToWhatsApp);
      } else if (this.selectedFilter() === 'SENT') {
        filtered = filtered.filter(inv => inv.sentToEmail && inv.sentToWhatsApp);
      }
    }

    return filtered.sort((a, b) => 
      new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()
    );
  });

  totalItems = computed(() => this.filteredInvoices().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.itemsPerPage())));

  paginatedInvoices = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredInvoices().slice(start, start + perPage);
  });

  // Stats
  stats = computed(() => {
    const all = this.invoices();
    return {
      total: all.length,
      pendingEmail: all.filter(inv => !inv.sentToEmail).length,
      pendingWhatsApp: all.filter(inv => !inv.sentToWhatsApp).length,
      sent: all.filter(inv => inv.sentToEmail && inv.sentToWhatsApp).length
    };
  });

  ngOnInit(): void {
    // ✅ Set user role
    this.isAdmin.set(this.authService.isAdmin());
    this.isSalesExec.set(this.authService.isSalesExecutive());
    
    this.loadInvoices();
  }
  
  loadInvoices(): void {
    this.isLoading.set(true);
    
    // ✅ Load based on role
    const invoiceObservable = this.isSalesExec() 
      ? this.invoiceService.getMyStudentsInvoices()  // Sales Executive
      : this.invoiceService.getAllInvoices();        // Admin
    
    invoiceObservable.subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading invoices:', error);
        this.isLoading.set(false);
        void this.showDialog('Load Failed', error?.error?.message || error?.error || 'Failed to load invoices', 'danger', 'error');
      }
    });
  }

  // ✅ UPDATED: Role-based navigation
  navigateToGenerate(): void {
    // Use relative navigation to stay within current dashboard
    this.router.navigate(['../generate'], { relativeTo: this.route });
  }

  // ✅ UPDATED: Role-based navigation
  navigateToEdit(id: number): void {
    // Use relative navigation to stay within current dashboard
    this.router.navigate(['../edit', id], { relativeTo: this.route });
  }

  async sendInvoiceEmail(id: number, invoiceNumber: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Send Invoice Email',
      message: `Send invoice "${invoiceNumber}" to the student by email?`,
      type: 'info',
      confirmText: 'Send Email',
      cancelText: 'Cancel',
      icon: 'email'
    });

    if (!confirmed) return;

    this.invoiceService.sendInvoiceEmail(id).subscribe({
      next: () => {
        this.loadInvoices();
        void this.showDialog('Email Sent', 'Invoice email sent successfully', 'success', 'check_circle');
      },
      error: (error: any) => {
        console.error('Error sending invoice email:', error);
        void this.showDialog('Email Send Failed', error?.error?.message || error?.error || 'Failed to send invoice email', 'danger', 'error');
      }
    });
  }

  async markAsSentToWhatsApp(id: number, invoiceNumber: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Mark WhatsApp Status',
      message: `Mark invoice "${invoiceNumber}" as sent to WhatsApp? This is status-only and does not send a real WhatsApp message.`,
      type: 'warning',
      confirmText: 'Mark as Sent',
      cancelText: 'Cancel',
      icon: 'chat'
    });

    if (!confirmed) return;

    this.invoiceService.markAsSentToWhatsApp(id).subscribe({
      next: () => {
        this.loadInvoices();
        void this.showDialog('Status Updated', 'Invoice marked as sent to WhatsApp (status only). No real WhatsApp message was sent.', 'success', 'check_circle');
      },
      error: (error: any) => {
        console.error('Error marking WhatsApp status:', error);
        void this.showDialog('Status Update Failed', error?.error?.message || error?.error || 'Failed to update WhatsApp status', 'danger', 'error');
      }
    });
  }

  async deleteInvoice(id: number, invoiceNumber: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Invoice',
      message: `Delete invoice "${invoiceNumber}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      icon: 'delete'
    });

    if (!confirmed) return;

    this.invoiceService.deleteInvoice(id).subscribe({
      next: () => {
        this.loadInvoices();
        void this.showDialog('Deleted', 'Invoice deleted successfully', 'success', 'check_circle');
      },
      error: (error: any) => {
        console.error('Error deleting invoice:', error);
        void this.showDialog('Delete Failed', error?.error?.message || error?.error || 'Failed to delete invoice', 'danger', 'error');
      }
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  updateFilter(value: string): void {
    this.selectedFilter.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  changeItemsPerPage(value: string): void {
    const next = Number(value);
    this.itemsPerPage.set(next);
    this.currentPage.set(1);
  }

  getDeliveryStatus(invoice: InvoiceDTO): string {
    if (invoice.sentToEmail && invoice.sentToWhatsApp) return 'SENT';
    if (invoice.sentToEmail) return 'SENT_EMAIL';
    if (invoice.sentToWhatsApp) return 'SENT_WHATSAPP';
    return 'PENDING';
  }

  getDeliveryClass(invoice: InvoiceDTO): string {
    const status = this.getDeliveryStatus(invoice);
    const classes: { [key: string]: string } = {
      'SENT': 'delivery-sent',
      'SENT_EMAIL': 'delivery-partial',
      'SENT_WHATSAPP': 'delivery-partial',
      'PENDING': 'delivery-pending'
    };
    return classes[status] || 'delivery-pending';
  }

  getDeliveryText(invoice: InvoiceDTO): string {
    const status = this.getDeliveryStatus(invoice);
    const texts: { [key: string]: string } = {
      'SENT': 'Fully Sent',
      'SENT_EMAIL': 'Email Only',
      'SENT_WHATSAPP': 'WhatsApp Only',
      'PENDING': 'Pending'
    };
    return texts[status] || 'Pending';
  }

  downloadPDF(invoiceId: number, invoiceNumber: string): void {
    this.invoiceService.downloadPDF(invoiceId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error downloading PDF:', error);
        void this.showDialog('Download Failed', error?.error?.message || error?.error || 'Failed to download PDF. Please try again.', 'danger', 'error');
      }
    });
  }

  async generatePDF(invoiceId: number, invoiceNumber: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Generate PDF',
      message: `Generate PDF for invoice "${invoiceNumber}"?`,
      type: 'info',
      confirmText: 'Generate',
      cancelText: 'Cancel',
      icon: 'picture_as_pdf'
    });

    if (!confirmed) return;

    this.invoiceService.generatePDF(invoiceId).subscribe({
      next: () => {
        this.loadInvoices();
        void this.showDialog('PDF Generated', 'PDF generated successfully', 'success', 'check_circle');
      },
      error: (error: any) => {
        console.error('Error generating PDF:', error);
        void this.showDialog('PDF Generation Failed', error?.error?.message || error?.error || 'Failed to generate PDF', 'danger', 'error');
      }
    });
  }

  getPaymentModeIcon(mode: string): string {
    const icons: { [key: string]: string } = {
      'CASH': 'payments',
      'CARD': 'credit_card',
      'UPI': 'qr_code_2',
      'NET_BANKING': 'account_balance',
      'CHEQUE': 'receipt',
      'ONLINE': 'language'
    };
    return icons[mode] || 'payment';
  }

  private async showDialog(
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'success',
    icon: string
  ): Promise<void> {
    await this.confirmationService.confirm({
      title,
      message,
      type,
      icon,
      confirmText: 'OK',
      cancelText: 'Close'
    });
  }
}
