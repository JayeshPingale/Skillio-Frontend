import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { ConfirmationService } from '../../../../core/services/Confirmation Dialog/confirmation.service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { FollowUpService } from '../../../../core/services/followup/follow-up.service';
import { FollowUpResponse } from '../../../../core/models/follow-up.model';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/loginServices/auth-service';
import { HasAnyPermissionDirective } from '../../../../core/directives/has-any-permission.directive';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';


@Component({
  selector: 'app-lead-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HasPermissionDirective, HasAnyPermissionDirective],
  templateUrl: './lead-list.html',
  styleUrls: ['./lead-list.css']
})
export class LeadListComponent implements OnInit {
  private leadService = inject(LeadService);
  private followUpService = inject(FollowUpService);
  private userService = inject(UserService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  public themeService = inject(ThemeService);
  public route = inject(ActivatedRoute);
  public authService = inject(AuthService);
  // ✅ Expose Math and Number for template
  public Math = Math;
  public Number = Number;

  leads = signal<LeadResponse[]>([]);
  users = signal<UserResponse[]>([]);
  isLoading = signal(false);
  searchTerm = signal('');
  selectedStatus = signal('ALL');
  selectedInterestLevel = signal('ALL');
  successMessage = signal('');
  errorMessage = signal('');

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(7);

  // Modals
  showViewModal = signal(false);
  showRemarksModal = signal(false);
  showAssignModal = signal(false);
  selectedLead = signal<LeadResponse | null>(null);
  leadFollowUps = signal<FollowUpResponse[]>([]);
  selectedUserId = signal<number | null>(null);

  statusOptions = ['ALL', 'NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'NEGOTIATION', 'CONVERTED', 'LOST'];
  interestLevelOptions = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

  // ✅ Computed signals for stats
  totalLeads = computed(() => this.leads().length);
  newLeads = computed(() => this.leads().filter(l => l.status === 'NEW').length);
  interestedLeads = computed(() => this.leads().filter(l => l.status === 'INTERESTED').length);
  convertedLeads = computed(() => this.leads().filter(l => l.status === 'CONVERTED').length);

  // Filtered leads
  filteredLeads = computed(() => {
    let filtered = this.leads();

    // Search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(l =>
        l.fullName.toLowerCase().includes(term) ||
        l.contactNumber.includes(term) ||
        (l.email && l.email.toLowerCase().includes(term)) ||
        l.courseInterested.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.selectedStatus() !== 'ALL') {
      filtered = filtered.filter(l => l.status === this.selectedStatus());
    }

    // Interest level filter
    if (this.selectedInterestLevel() !== 'ALL') {
      filtered = filtered.filter(l => l.interestLevel === this.selectedInterestLevel());
    }

    return filtered;
  });

  // Pagination computed
  totalItems = computed(() => this.filteredLeads().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.itemsPerPage()));

  // Paginated leads
  paginatedLeads = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.filteredLeads().slice(start, end);
  });

  ngOnInit(): void {
    this.loadLeads();
    this.loadUsers();
  }

  // loadLeads(): void {
  //    const isSales = this.authService.isSalesExecutive();

  //   this.isLoading.set(true);
  //   this.leadService.getAllLeads().subscribe({
  //     next: (data) => {
  //       this.leads.set(data);
  //       this.isLoading.set(false);
  //     },
  //     error: (error) => {
  //       console.error('Error loading leads:', error);
  //       this.errorMessage.set('Failed to load leads');
  //       this.isLoading.set(false);
  //     }
  //   });
  // }

  loadLeads(): void {
  this.isLoading.set(true);
  
  const isSalesExec = this.authService.isSalesExecutive();

  const leads$ = isSalesExec
    ? this.leadService.getMyLeads()      // ✅ Sales: sirf assigned leads
    : this.leadService.getAllLeads();    // ✅ Admin: sab leads

  leads$.subscribe({
    next: (data) => {
      this.leads.set(data);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error loading leads:', error);
      this.errorMessage.set('Failed to load leads');
      this.isLoading.set(false);
    }
  });
}

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        const salesExecutives = data.filter(u => u.roleName === 'SALES_EXECUTIVE');
        this.users.set(salesExecutives);
      },
      error: (error) => console.error('Error loading users:', error)
    });
  }

  // View Details Modal
  openViewModal(lead: LeadResponse): void {
    this.selectedLead.set(lead);
    this.showViewModal.set(true);
  }

  closeViewModal(): void {
    this.showViewModal.set(false);
    this.selectedLead.set(null);
  }

  // Remarks & Follow-ups Modal
  openRemarksModal(lead: LeadResponse): void {
    this.selectedLead.set(lead);
    this.loadFollowUps(lead.leadId);
    this.showRemarksModal.set(true);
  }

  closeRemarksModal(): void {
    this.showRemarksModal.set(false);
    this.selectedLead.set(null);
    this.leadFollowUps.set([]);
  }

  loadFollowUps(leadId: number): void {
    this.followUpService.getFollowUpsByLead(leadId).subscribe({
      next: (data) => this.leadFollowUps.set(data),
      error: (error) => console.error('Error loading follow-ups:', error)
    });
  }

  // Assign Lead Modal
  openAssignModal(lead: LeadResponse): void {
    this.selectedLead.set(lead);
    this.selectedUserId.set(lead.assignedToUserId);
    this.showAssignModal.set(true);
  }

  closeAssignModal(): void {
    this.showAssignModal.set(false);
    this.selectedLead.set(null);
    this.selectedUserId.set(null);
  }
  goToAssign(leadId: number) {
  this.router.navigate([leadId, 'assign'], {
    relativeTo: this.route
  });
}


  assignLead(): void {
    if (!this.selectedLead() || !this.selectedUserId()) {
      this.errorMessage.set('Please select a user');
      return;
    }

    const request = {
      leadId: this.selectedLead()!.leadId,
      salesExecutiveId: this.selectedUserId()!,
      remarks: `Assigned to ${this.getUserName(this.selectedUserId()!)}`
    };

    this.leadService.assignLead(request).subscribe({
      next: () => {
        this.successMessage.set('Lead assigned successfully!');
        this.loadLeads();
        this.closeAssignModal();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        console.error('Error assigning lead:', error);
        this.errorMessage.set('Failed to assign lead');
      }
    });
  }

navigateToEdit(leadId: number): void {
  this.router.navigate(['edit', leadId], { relativeTo: this.route });
}


navigateToCreate(): void {
  this.router.navigate(['create'], { relativeTo: this.route });
}
  // Delete
  async deleteLead(leadId: number, leadName: string): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Lead',
      message: `Are you sure you want to delete "${leadName}"?`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.leadService.deleteLead(leadId).subscribe({
        next: () => {
          this.successMessage.set('Lead deleted successfully!');
          this.loadLeads();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          console.error('Error deleting lead:', error);
          this.errorMessage.set('Failed to delete lead');
        }
      });
    }
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changeItemsPerPage(value: string): void {
    this.itemsPerPage.set(Number(value));
    this.currentPage.set(1);
  }

  // Helpers
  getUserName(userId: number | null): string {
    if (!userId) return 'Unassigned';
    const user = this.users().find(u => u.userId === userId);
    return user?.fullName || 'Unknown User';
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'NEW': 'status-new',
      'CONTACTED': 'status-contacted',
      'INTERESTED': 'status-interested',
      'QUALIFIED': 'status-qualified',
      'NEGOTIATION': 'status-negotiation',
      'CONVERTED': 'status-converted',
      'LOST': 'status-lost'
    };
    return classes[status] || 'status-new';
  }

  getInterestLevelClass(level: string): string {
    const classes: { [key: string]: string } = {
      'HIGH': 'interest-high',
      'MEDIUM': 'interest-medium',
      'LOW': 'interest-low'
    };
    return classes[level] || 'interest-medium';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'NEW': 'fiber_new',
      'CONTACTED': 'phone',
      'INTERESTED': 'star',
      'QUALIFIED': 'verified',
      'NEGOTIATION': 'handshake',
      'CONVERTED': 'check_circle',
      'LOST': 'cancel'
    };
    return icons[status] || 'info';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ✅ Helper method for follow-up icon
  getFollowUpIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'CALL': 'phone',
      'EMAIL': 'email',
      'VISIT': 'location_on',
      'WHATSAPP': 'chat'
    };
    return icons[type] || 'message';
  }
navigateToAddFollowUp(): void {
  if (this.selectedLead()) {
    const lead = this.selectedLead()!;
    
    this.closeRemarksModal();
    
    // ✅ Navigate to sibling module (follow-ups)
    this.router.navigate(['../follow-ups/create'], {
      relativeTo: this.route,
      queryParams: { 
        leadId: lead.leadId,
        leadName: encodeURIComponent(lead.fullName)
      },
      queryParamsHandling: 'merge'
    });
    
    console.log('Navigating with:', lead.leadId, lead.fullName);
  }
}



}
