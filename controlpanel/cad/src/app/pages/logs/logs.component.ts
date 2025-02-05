import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { LogFilter, LogsService } from '../../services/logs.service';
import { GlobalStateService } from '../../services/global-state.service';
import { isProtectedAppEmpty } from '../../models/protected-app';
import { Logs } from '../../models/logs';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { RoundCheckboxComponent } from "../../components/round-checkbox/round-checkbox.component";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, RoundCheckboxComponent, FormsModule],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit, OnDestroy {
  logs: Logs[] = [];
  globalStateSubscription?: Subscription;
  filter: LogFilter = {time: {operator: '', value: '1h'}};
  allowedSearchValues: string[] = [];
  toggleFilter = false;
  currentValueFilter = { key:'', operator:'', value:'' };

  get filterKeys() {
    return Object.keys(this.filter).filter(key => key != 'type' && key != 'Severity' && key != 'Behavior');
  }
  get allowedSearchOnce() {
    return this.allowedSearchValues.filter(value => !this.filterKeys.includes(value));
  }
  constructor(private logsService: LogsService, private globalState: GlobalStateService, private toastr: ToastrService) {}

  async ngOnInit() {
    this.globalStateSubscription = this.globalState.selectedApp$.subscribe(data => {
      if (isProtectedAppEmpty(data)) return;
      this.getLogList();
    });
  }

  ngOnDestroy() {
    this.globalStateSubscription?.unsubscribe();
  }

  async getLogList() {
    const logsResponse = await this.logsService.getLogsByApp(this.filter);
    if (logsResponse.type == 'error') this.toastr.error(logsResponse.message, "Error");
    this.logs = logsResponse.data as Logs[] || [];
  }
  toggleMoreLog(e: MouseEvent) {
    const tr = e.currentTarget as HTMLElement;
    if (tr.classList.contains('open-log-content')) tr.classList.remove('open-log-content');
    else tr.classList.add('open-log-content');
  }

  onSelectType = (type: string) => { 
    if (this.filter['type'] && this.filter['type'].value == type) delete this.filter['type'];
    else {
      this.filter['type'] = { operator: '', value: '' };
      this.filter['type'].value = type;
    }
    this.allowedSearchValues = [];
    if (this.filter['type'] && this.filter['type'].value == 'alert') this.allowedSearchValues.push(...['Time', 'RequestID', 'DestinationIP', 'Url', 'SourceIP', 'Authenticated', 'Session', 'Username', 'Useragent', 'Path', 'Method', 'DecoyType', 'DecoyKey', 'DecoyExpectedValue', 'DecoyInjectedValue']);
    if (this.filter['type'] && this.filter['type'].value == 'event') this.allowedSearchValues.push(...['SourceIp', 'UserAgent', 'Session', 'Behavior', 'Delay', 'Duration']);
    this.getLogList()
  }
  onSelectSeverity = (severity: string) => {
    if (this.filter['Severity'] && this.filter['Severity'].value == severity) delete this.filter['Severity'];
    else {
      this.filter['Severity'] = { operator: '', value: '' };
      this.filter['Severity'].value = severity;
    }
    this.getLogList();
  }
  onSelectBehavior = (behavior: string) => {
    if (this.filter['Behavior'] && this.filter['Behavior'].value == behavior) delete this.filter['Behavior'];
    else {
      this.filter['Behavior'] = { operator: '', value: '' };
      this.filter['Behavior'].value = behavior;
    }
    this.getLogList();
  }
  onAddValuesFilter() {
    if (!this.filter[this.currentValueFilter.key] && (this.currentValueFilter.key && this.currentValueFilter.value)) {
      this.filter[this.currentValueFilter.key] = { operator: this.currentValueFilter.operator, value: this.currentValueFilter.value };
      this.currentValueFilter = { key:'', operator:'', value:'' };
      this.getLogList();
    }
  }
  removeFilter(key: string) {
    delete this.filter[key];
    this.getLogList();
  }
  clearFilters() {
    this.filter = { time: { operator: '', value: '1h' } };
    this.currentValueFilter = { key:'', operator:'', value:'' };
    this.getLogList();
  }

  isChecked(key: string, value: string) {
    if (!this.filter[key]) return false;
    return this.filter[key].value == value;
  }
}