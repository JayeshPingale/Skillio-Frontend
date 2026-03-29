// src/app/components/admin/invoices/invoice-list/invoice-list.ts

import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // ✅ Add ActivatedRoute
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { InvoiceService, InvoiceDTO } from '../../../../core/services/Invoice/invoice.service';
import { AuthService } from '../../../../core/services/loginServices/auth-service';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoice-list.html',
  styleUrls: ['./invoice-list.css']
})
export class InvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // ✅ ADD
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  
  isAdmin = signal(false);
  isSalesExec = signal(false);
  invoices = signal<InvoiceDTO[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedFilter = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

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
    this.errorMessage.set('');
    
    // ✅ Load based on role
    const invoiceObservable = this.isSalesExec() 
      ? this.invoiceService.getMyStudentsInvoices()  // Sales Executive
      : this.invoiceService.getAllInvoices();        // Admin
    
    invoiceObservable.subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading invoices:', error);
        this.errorMessage.set('Failed to load invoices');
        this.isLoading.set(false);
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

  markAsSentToEmail(id: number, invoiceNumber: string): void {
    if (confirm(`Mark invoice "${invoiceNumber}" as sent to Email?`)) {
      this.invoiceService.markAsSentToEmail(id).subscribe({
        next: () => {
          this.successMessage.set('Invoice marked as sent to Email!');
          this.loadInvoices();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('Error marking as sent:', error);
          this.errorMessage.set('Failed to mark invoice as sent');
        }
      });
    }
  }

  markAsSentToWhatsApp(id: number, invoiceNumber: string): void {
    if (confirm(`Mark invoice "${invoiceNumber}" as sent to WhatsApp?`)) {
      this.invoiceService.markAsSentToWhatsApp(id).subscribe({
        next: () => {
          this.successMessage.set('Invoice marked as sent to WhatsApp!');
          this.loadInvoices();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('Error marking as sent:', error);
          this.errorMessage.set('Failed to mark invoice as sent');
        }
      });
    }
  }

  deleteInvoice(id: number, invoiceNumber: string): void {
    if (confirm(`Delete invoice "${invoiceNumber}"?`)) {
      this.invoiceService.deleteInvoice(id).subscribe({
        next: () => {
          this.successMessage.set('Invoice deleted successfully!');
          this.loadInvoices();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('Error deleting invoice:', error);
          this.errorMessage.set('Failed to delete invoice');
        }
      });
    }
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateFilter(value: string): void {
    this.selectedFilter.set(value);
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
        
        this.successMessage.set('PDF download started!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error: any) => {
        console.error('Error downloading PDF:', error);
        this.errorMessage.set('Failed to download PDF. Please try again.');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  generatePDF(invoiceId: number, invoiceNumber: string): void {
    if (confirm(`Generate PDF for invoice "${invoiceNumber}"?`)) {
      this.invoiceService.generatePDF(invoiceId).subscribe({
        next: () => {
          this.successMessage.set('PDF generated successfully!');
          this.loadInvoices();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error: any) => {
          console.error('Error generating PDF:', error);
          this.errorMessage.set('Failed to generate PDF');
        }
      });
    }
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
}
