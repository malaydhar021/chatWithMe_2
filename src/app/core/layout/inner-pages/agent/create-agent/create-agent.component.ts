import { ActivatedRoute, Data, Router } from '@angular/router';
import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/distinctUntilChanged';

import * as AdminActions from '../../../store/admin/admin.actions';
import * as AgentActions from '../../../store/agent/agent.actions';
import * as DepartmentActions from '../../../store/department/department.actions';
import * as fromAuth from '../../../../store/auth/auth.reducers';
import * as fromAfterLogin from '../../../store/after-login.reducers';
import {BsModalService} from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import * as DepartmentReducer from '../../../store/department/department.reducers';

@Component({
  selector: 'app-create-agent',
  templateUrl: './create-agent.component.html',
  styleUrls: ['./create-agent.component.css'],
})
export class CreateAgentComponent implements OnInit, AfterViewChecked, OnDestroy {

    /** Variable Declaration */
    @ViewChild('form') form: NgForm;
    authState: Observable<fromAuth.State>;
    afterLoginState: Observable<fromAfterLogin.FeatureState>;
    adminList: Subscription;
    afterLoginSubscription: Subscription;
    authSubscription: Subscription;
    newDeptID: Subscription;
    editMode = false;
    userId: number;
    updateAgent: any;
    selectAdmin = false;
    selectDept = false;

    mask: Array<string | RegExp> = ['(', /[1-9]/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/];
    loggedInAdminId: number;
    agent = {
      userId: 0,
      parentId: 0,
      departmentId: [],
      firstName: '',
      lastName: '',
      email: '',
      userName: '',
      phone: ''
    };

    // departments: any;
    loader = false;
    bsModalRef: BsModalRef;             /** bootstrap modal */
    dep: any;                            /** initialize the department object */
    adminUserId: number;                 /** admin user id from admin selection droupdown */
    listOfAdmins = [];
    updatedlistOfAdmins = [];
    adminName: any;
    showThis = false;
    isemailNotification = true;
    isPhoneNotification = true;
    dropdownSettings = {};          /** dropDown settings blank obj*/
    createDeptSuccess = false;
    deptList = [];
    changeAdmin: boolean = false;
  /** Service injection */
    constructor(private store: Store<fromAfterLogin.AfterLoginFeatureState>,
                private activatedRoute: ActivatedRoute,
                private cdr: ChangeDetectorRef, private router: Router, private modalService: BsModalService,
                private deptStore: Store<DepartmentReducer.DepartmentState>) { }

    /** Function to be executed when component initializes */
    ngOnInit() {
      this.store.dispatch(new AdminActions.GetAdminListAttempt());
      this.authState = this.store.select('auth');
      this.afterLoginState = this.store.select('afterLogin');
      this.store.dispatch(new DepartmentActions.GetDepartmentListAttempt());
      this.authSubscription = this.store.select('auth')
        .subscribe(
          (data) => {
            if (data.isAdmin) {
              this.agent.parentId = data.userId;
              this.loggedInAdminId = data.userId;
            }
          }
        );
      this.updateAgent = this.store.select('afterLogin')
        .map(data => data.agent.toEdit)
        .distinctUntilChanged()
        .subscribe(
          (agent) => {
            if (Object.keys(agent).length !== 0) {
              this.adminUserId = agent.parent_id;
              this.store.dispatch(new DepartmentActions.GetAgentDepartmentListAttempt({userId: this.adminUserId}));
              this.agent.parentId = agent.parent_id;
              this.agent.firstName = agent.first_name;
              this.agent.lastName = agent.last_name;
              this.agent.userName = agent.username;
              this.agent.email = agent.email;
              this.agent.phone = agent.phone;
              this.agent.departmentId = agent.departments;
              this.adminName = agent.admin_first_name + ' ' + agent.admin_last_name;
              this.isemailNotification = agent.is_email_notification;
              this.isPhoneNotification = agent.is_phone_notification;
            }
          }
        );
        this.activatedRoute.data
          .subscribe(
            (data: Data) => {
              this.editMode = data['editMode'];
              if (this.editMode) {
                /** Perform operation is present mode is edit mode */
                this.selectDept = true;
                this.userId = this.activatedRoute.snapshot.params['id'];
                this.store.dispatch(new AgentActions.GetToEditAgentAttempt({agentId: this.userId}));
                  this.selectAdmin = true;
              } else {
                this.adminUserId = 0;
                this.agent.firstName = '';
                this.agent.lastName = '';
                this.agent.userName = '';
                this.agent.email = '';
                this.agent.phone = '';
                this.agent.departmentId = [];
                this.adminName = '';
                this.isemailNotification = true;
                this.isPhoneNotification = true;
              }
            }
        );

        // this.afterLoginSubscription = this.store.select('afterLogin')
        //   .map(data => data.agent.resetAgentForm)
        //   .subscribe(
        //     (data) => {
        //         console.log(data);
        //       if (data) {
        //         this.loader = false;
        //         this.form.reset();
        //         this.selectDept = false;
        //         this.store.dispatch(new AgentActions.ResetAgentForm());
        //         if (!!this.loggedInAdminId) {
        //           this.form.form.patchValue({ parentId: this.loggedInAdminId, departmentId: 0 });
        //         }
        //       }
        //     }
        //   );

        this.dep = {
            userId: '',
            departmentName: '',
            departmentDetails: ''
        };

        this.adminList = this.store.select('afterLogin').map(data => data)
            .subscribe(
                (data) => {
                    if (data.admin.list) {
                        this.listOfAdmins = data.admin.list;
                    }
                }
            );

        /** iniciate drop down settings */
        this.dropdownSettings = {
            singleSelection: false,
            text: 'Select Department',
            selectAllText: 'Select All',
            unSelectAllText: 'UnSelect All',
            enableSearchFilter: false,
            classes: 'myclass custom-class',
            primaryKey: 'id',
            labelKey: 'department_name'
        };

      this.afterLoginSubscription = this.store.select('department')
        .subscribe(
          (data) => {
            if (data) {
                if (this.changeAdmin || this.editMode) {
                    this.deptList = data.list;
                } if(!this.changeAdmin && !this.editMode){
                    this.deptList = data.list;
                }
              if (data.newDepartmentId > 0 && this.createDeptSuccess) {
                const oldArray = this.agent.departmentId;
                const newObj = [{id: data.newDepartmentId, department_name: data.newDepartmentName}];
                let fIndex: any = -1;
                if (oldArray.length > 0) {
                  oldArray.forEach((elem, index) => {
                    if (elem.id === newObj[0].id) {
                      fIndex = index;
                    }
                  });
                }
                if (fIndex !== -1) {
                  oldArray.splice(fIndex, 1);
                }

                this.agent.departmentId = [...oldArray, ...newObj];
                  this.store.dispatch(new DepartmentActions.GetAgentDepartmentListAttempt({userId: this.agent.parentId}));
              }
            }
          }
        );
    }

    checkAdminname($event) {
        this.showThis = true;
        return this.updatedlistOfAdmins = this.listOfAdmins.filter(item => item.first_name.toLowerCase().indexOf($event) !== -1);
    }

    assignValue(id, first_name, last_name) {
        this.agent.parentId = id;
        this.adminName = first_name + ' ' + last_name;
        this.showThis = false;
        this.adminChanged(id);
    }

    resetList() {
        this.adminName = '';
        this.showThis = true;
        this.agent.parentId = 0;
        this.agent.departmentId = [];
        this.deptList = [];
    }

    ngAfterViewChecked() {
      this.cdr.detectChanges();
    }

    /** Function call to create or edit a admin */
    onCreateAgent(form: NgForm) {
      if (this.editMode) {
        const data = { ...form.value, userId: this.userId };
        this.store.dispatch(new AgentActions.EditAgentAttempt({...data}));
      } else {
          /** Create Agent */
        this.store.dispatch(new AgentActions.CreateAgentAttempt(form.value));
      }
    }

    /** Un-subscribing from all custom made events when component is destroyed */
    ngOnDestroy() {
      this.agent.departmentId = [];
       this.afterLoginSubscription.unsubscribe();
      this.authSubscription.unsubscribe();
       this.updateAgent.unsubscribe();
    }

    /** Function to fetch department list with respect to adminId/userId */
    adminChanged(id: number) {
      if (!!id) {
        this.adminUserId = id;
        this.agent.departmentId = [];
          this.changeAdmin = true;
        this.store.dispatch(new DepartmentActions.GetAgentDepartmentListAttempt({ userId: id}));
      }
    }

    /** Function to check if valid department is selected */
    deptChanged(id: any) {
      this.selectDept = id > 0;
        if ( id === '99999991999999' ) {
            const element: HTMLElement = document.getElementById('createDepartment') as HTMLElement;
            element.click();
        }
    }

    /** Function to create a department from the create agent page */
    createDepartment( template:  TemplateRef<any> ) {
      this.createDeptSuccess = false;
        this.dep.userId = this.adminUserId;
        this.bsModalRef = this.modalService.show(template);
    }
    // /** function to create a department */
    // onCreateDep(form) {
    //   this.store.dispatch(new DepartmentActions.AddDepartmentAttempt(form.value));
    //
    //   this.afterLoginSubscription = this.store.select('afterLogin')
    //     .map(data => data.department.newDepartmentId)
    //     .subscribe(
    //       (data) => {
    //         if (data) {
    //          /// this.agent.departmentId = data;
    //         }
    //       }
    //     );
    //
    //   this.bsModalRef.hide();
    // }

    /** function to create a department */
    onCreateDep(form) {
      this.createDeptSuccess = true;
        this.store.dispatch(new DepartmentActions.AddDepartmentAttempt(form.value));
        this.bsModalRef.hide();
    }

}
