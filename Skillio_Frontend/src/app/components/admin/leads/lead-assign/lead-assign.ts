import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AssignLeadRequest, LeadResponse, LeadService } from '../../../../core/services/lead/lead.service';
import { ThemeService } from '../../../../core/services/theme/theme-service';
import { UserResponse, UserService } from '../../../../core/services/users/user.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lead-assign',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './lead-assign.html',
  styleUrls: ['./lead-assign.css']
})
export class LeadAssignComponent implements OnInit {
  private leadService = inject(LeadService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public themeService = inject(ThemeService);

  currentLead = signal<LeadResponse | null>(null);
  salesUsers = signal<UserResponse[]>([]);
  selectedUserId = signal<number | null>(null);
  remarks = signal<string>('');  // ✅ Added for remarks field
  leadId = signal<number>(0);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  searchTerm = signal('');
  isUnassigning = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Invalid lead ID');
      return;
    }

    this.leadId.set(Number(id));
    this.isLoading.set(true);

    Promise.all([
      this.loadLeadDetails(),
      this.loadSalesUsers()
    ]).then(() => {
      this.isLoading.set(false);
    }).catch(error => {
      this.errorMessage.set('Failed to load data');
      this.isLoading.set(false);
      console.error('Error loading data:', error);
    });
  }

  loadLeadDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.leadService.getLeadById(this.leadId()).subscribe({
        next: (lead) => {
          this.currentLead.set(lead);
          // ✅ Set currently assigned user
          if (lead.assignedToUserId) {
            this.selectedUserId.set(lead.assignedToUserId);
          }
          resolve();
        },
        error: (error) => {
          console.error('Error loading lead:', error);
          reject(error);
        }
      });
    });
  }

  loadSalesUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          // ✅ Filter only active sales users and admins
          const salesUsers = users.filter(u => 
            (u.roleName === 'ROLE_SALES_EXECUTIVE' || 
             u.roleName === 'ROLE_ADMIN' || 
             u.roleName === 'ROLE_MANAGER') && 
            u.isActive
          );
          this.salesUsers.set(salesUsers);
          resolve();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          reject(error);
        }
      });
    });
  }

  selectUser(userId: number): void {
    this.selectedUserId.set(userId);
    this.errorMessage.set('');  // ✅ Clear error when user selects
  }

  updateRemarks(value: string): void {
    this.remarks.set(value);
  }


unassignLead(): void {
  if (!this.isLeadAssigned()) {
    this.errorMessage.set('Lead is not currently assigned');
    return;
  }

  this.isUnassigning.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');

  this.leadService.unassignLead(this.leadId()).subscribe({
    next: (response) => {
      console.log('✅ Lead unassigned successfully:', response);
      this.isUnassigning.set(false);
      this.successMessage.set('Lead unassigned successfully!');
      
      // Clear selection and update current lead
      this.selectedUserId.set(null);
      this.currentLead.set(response);
      
      // Optional: Navigate back after 1.5 seconds
      setTimeout(() => {
        this.router.navigate(['../..'], { relativeTo: this.route });
      }, 1500);
    },
    error: (error) => {
      console.error('❌ Unassign lead error:', error);
      this.isUnassigning.set(false);
      
      let errorMsg = 'Failed to unassign lead. Please try again.';
      if (error.error?.message) {
        errorMsg = error.error.message;
      }
      
      this.errorMessage.set(errorMsg);
    }
  });
}

// Update assignLead method to handle already assigned case
assignLead(): void {
  if (!this.selectedUserId()) {
    this.errorMessage.set('Please select a user to assign');
    return;
  }

  // Check if trying to assign to same user
  if (this.isReassigningSameUser()) {
    this.errorMessage.set('Lead is already assigned to this user');
    return;
  }

  this.isSubmitting.set(true);
  this.errorMessage.set('');
  this.successMessage.set('');

  const request: AssignLeadRequest = {
    leadId: this.leadId(),
    salesExecutiveId: this.selectedUserId()!,
    remarks: this.remarks() || undefined
  };

  console.log('🚀 Assigning lead with request:', request);

  this.leadService.assignLead(request).subscribe({
    next: (response) => {
      console.log('✅ Lead assigned successfully:', response);
      this.isSubmitting.set(false);
      this.successMessage.set('Lead assigned successfully!');
      setTimeout(() => {
        this.router.navigate(['../..'], { relativeTo: this.route }); // ✅ Relative navigation
      }, 1500);
    },
    error: (error) => {
      console.error('❌ Assign lead error:', error);
      this.isSubmitting.set(false);
      
      let errorMsg = 'Failed to assign lead. Please try again.';
      if (error.error?.message) {
        errorMsg = error.error.message;
      } else if (error.status === 400) {
        errorMsg = 'Lead is already assigned. Please unassign first.'; // ✅ Updated message
      } else if (error.status === 404) {
        errorMsg = 'Lead or user not found.';
      } else if (error.status === 500) {
        errorMsg = 'Server error. Please try again later.';
      }

      this.errorMessage.set(errorMsg);
    }
  });
}

// Update cancel method
cancel(): void {
  this.router.navigate(['../..'], { relativeTo: this.route }); // ✅ Relative navigation
}



  getFilteredUsers() {
    if (!this.searchTerm()) {
      return this.salesUsers();
    }
    
    const term = this.searchTerm().toLowerCase();
    return this.salesUsers().filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.roleName.toLowerCase().includes(term)  // ✅ Added role search
    );
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'NEW': 'fiber_new',
      'CONTACTED': 'call',
      'INTERESTED': 'star',
      'QUALIFIED': 'verified',
      'NEGOTIATION': 'forum',
      'CONVERTED': 'check_circle',
      'LOST': 'cancel'
    };
    return icons[status] || 'label';
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

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getRoleBadgeClass(role: string): string {
    const classes: { [key: string]: string } = {
      'ROLE_ADMIN': 'badge-admin',
      'ROLE_SALES_EXECUTIVE': 'badge-sales',
      'ROLE_MANAGER': 'badge-manager'
    };
    return classes[role] || 'badge-default';
  }

  formatRoleName(role: string): string {
    return role.replace('ROLE_', '').replace(/_/g, ' ');
  }

  // ✅ Check if lead is already assigned
  isLeadAssigned(): boolean {
    return this.currentLead()?.assignedToUserId !== null && 
           this.currentLead()?.assignedToUserId !== undefined;
  }

  // ✅ Check if reassigning to same user
  isReassigningSameUser(): boolean {
    return this.currentLead()?.assignedToUserId === this.selectedUserId();
  }
}
