import { Component, OnDestroy, OnInit } from '@angular/core';
import { TooltipComponent } from "../../components/tooltip/tooltip.component";
import { CommonModule } from '@angular/common';
import { Config, InSessionType, InUsernameType, isInSession, isInUsername } from '../../models/config';
import { AlertActionTableComponent, FormRespond } from '../../components/alert-action-table/alert-action-table.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OnlyNumbersDirective } from '../../directives/only-numbers.directive';
import { DelayType, DurationType, RespondType } from '../../models/decoy';
import { CustomValidators } from '../../validators/customValidators';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { GlobalStateService } from '../../services/global-state.service';
import { ToastrService } from 'ngx-toastr';
import { isEmptyObject } from '../../utils';
import { ConfigData } from '../../models/config-data';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [TooltipComponent, CommonModule, AlertActionTableComponent, FormsModule, ReactiveFormsModule, OnlyNumbersDirective],
  templateUrl: './config.component.html',
  styleUrl: './config.component.scss'
})
export class ConfigComponent implements OnInit, OnDestroy {

  configForm: FormGroup;
  config: Config = {};
  configSubscription?: Subscription
  isUpdating = false;
  isSync = false;
  
  validRespond = false;
  actionTouched = false;
  actionArray: FormRespond[] = [];

//#region Tooltip
tooltipTitle = '';
showTooltip = false;
tooltipText = '';
tooltipLink = '';
topPosition: any;
leftPosition: any;
tooltipTimeout:any;

onHoverInfo(tooltipTitle?: string, tooltipText?: string, tooltipLink?: string, e?: MouseEvent) {
  clearTimeout(this.tooltipTimeout);
  this.showTooltip = true;
  if (tooltipTitle) this.tooltipTitle = tooltipTitle;
  if (tooltipText) this.tooltipText = tooltipText;
  if (tooltipLink) this.tooltipLink = tooltipLink;
  if (e) {
    this.topPosition = e.clientY ?? this.topPosition;
    this.leftPosition = e.clientX ?? this.leftPosition;
  }
}
onLeaveInfo() {
  this.tooltipTimeout = setTimeout(() => {
    this.showTooltip = false;
    this.tooltipText = '';
    this.topPosition = null;
    this.leftPosition = null;
  }, 100)
}
//#endregion

  constructor(private configService: ConfigService, private globalState: GlobalStateService, private toastr: ToastrService) {
    this.configForm = new FormGroup({
      sessionIn: new FormControl(''),
      sessionKey: new FormControl(''),
      usernameIn: new FormControl(''),
      usernameKey: new FormControl(''),
      usernameValue: new FormControl(''),
      server: new FormControl(''),
      blocklistReload: new FormControl('')
    })
  }

  ngOnInit() {
    this.configForm.valueChanges.subscribe(() => { if(!this.isUpdating) this.isSync = false})
    this.globalState.selectedApp$.subscribe(async selectedApp => {
      const apiResponse = await this.configService.getConfig(selectedApp.id)
      if (apiResponse.type == 'error') {
        this.toastr.error(apiResponse.message, "Error");
        this.fillForm({});
        this.config = {};
        this.actionArray = [];
      } else {
        this.isSync = (apiResponse.data as ConfigData).deployed
      }
      this.configSubscription = this.configService.config$.subscribe(data => {
        if (!this.isUpdating){
          this.isUpdating = true
          this.config = data;
          this.fillForm(this.config);
          this.isUpdating = false;
        }
      })
    })

    this.configForm.get('sessionIn')?.valueChanges.subscribe(newSessionIn => {
      this.updateSessionIn(newSessionIn);
    })
    this.configForm.get('sessionKey')?.valueChanges.subscribe(newSessionKey => {
      this.updateSessionKey(newSessionKey);
    })

    this.configForm.get('usernameIn')?.valueChanges.subscribe(newUsernameIn => {
      this.updateUsernameIn(newUsernameIn);
    })
    this.configForm.get('usernameKey')?.valueChanges.subscribe(newUsernameKey => {
      this.updateUsernameKey(newUsernameKey);
    })
    this.configForm.get('usernameValue')?.valueChanges.subscribe(newUsernameValue => {
      this.updateUsernameValue(newUsernameValue);
    })

    this.configForm.get('server')?.valueChanges.subscribe(newServer => {
      if (newServer) this.config.server = newServer;
    })
    this.configForm.get('blocklistReload')?.valueChanges.subscribe(newBlocklistReload => {
      if (newBlocklistReload) this.config.blocklistReload = newBlocklistReload;
    })
  }

  ngOnDestroy(): void {
    this.configSubscription?.unsubscribe();
  }

  // #region Getter/Setter
  get sessionIn(): FormControl {
    return this.configForm.get('sessionIn') as FormControl;
  }
  set sessionIn(value: string) {
    this.configForm.get('sessionIn')?.setValue(value, { emitEvent: false });
  }
  set sessionKey(value: string) {
    this.configForm.get('sessionKey')?.setValue(value, { emitEvent: false });
  }
  set usernameIn(value: string) {
    this.configForm.get('usernameIn')?.setValue(value, { emitEvent: false });
  }
  set usernameKey(value: string) {
    this.configForm.get('usernameKey')?.setValue(value, { emitEvent: false });
  }
  set usernameValue(value: string) {
    this.configForm.get('usernameValue')?.setValue(value, { emitEvent: false });
  }
  // #endregion

  updateSessionIn(newSessionIn: InSessionType) {
    if (!newSessionIn){
      delete this.config.alert?.session;
      this.sessionIn = '';
      this.sessionKey = '';
      return;
    }
    if (!isInSession(newSessionIn)) return;
    if (!this.config.alert) this.config.alert = {};
    if (!this.config.alert.session) {
      this.config.alert.session = { in: newSessionIn, key: ''};
      return;
    } else {
      this.config.alert.session.in = newSessionIn;
    }
  }
  updateSessionKey(newSessionKey: string) {
    if (!newSessionKey) return;
    if (!this.config.alert) this.config.alert = {};
    if (!this.config.alert.session) {
      this.config.alert.session = { key: newSessionKey, in: 'header'};
      this.sessionIn = 'header';
      return;
    } else {
      this.config.alert.session.key = newSessionKey;
    }
  }
  updateUsernameIn(newUsernameIn: InUsernameType) {
    if (!newUsernameIn){
      delete this.config.alert?.username;
      this.usernameIn = '';
      this.usernameKey = '';
      this.usernameValue = '';
      return;
    }
    if (!isInUsername(newUsernameIn)) return;
    if (!this.config.alert) this.config.alert = {};
    if (!this.config.alert.username) {
      this.config.alert.username = { in: newUsernameIn, value: '' };
      return;
    } else {
      this.config.alert.username.in = newUsernameIn;
    }
  }
  updateUsernameKey(newUsernameKey: string) {
    if (!newUsernameKey) return;
    if (!this.config.alert) this.config.alert = {};
    if (!this.config.alert.username) {
      this.config.alert.username = { key: newUsernameKey, in: 'header', value: '' };
      this.usernameIn = 'header';
      return;
    } else {
      this.config.alert.username.key = newUsernameKey;
    }
  }
  updateUsernameValue(newUsernameValue: string) {
    if (!newUsernameValue) return;
    if (!this.config.alert) this.config.alert = {};
    if (!this.config.alert.username) {
      this.config.alert.username = { value: newUsernameValue, in: 'header' };
      this.usernameIn = 'header';
      return;
    } else {
      this.config.alert.username.value = newUsernameValue;
    }
  }

  onActionChange(newActions: FormRespond[]) {
    this.actionTouched = true;
    if (!newActions) return;
    this.config.respond = newActions.map(({ delayExtension, delay, durationExtension, duration, ...rest }) => {
      let newDelay = '';
      let newDuration = '';
      let newRespond: RespondType = rest;
      if (delayExtension !== 'now' && delayExtension !== undefined && delay !== undefined) {
        newDelay = delay + delayExtension;
      } else newDelay = 'now'
      if (durationExtension !== 'forever' && durationExtension !== undefined && duration !== undefined) {
        newDuration = duration + durationExtension;
      } else newDuration = 'forever'
      if (delay !== undefined) {
        newRespond.delay = newDelay as DelayType;
      }
      if (duration !== undefined) {
        newRespond.duration = newDuration as DurationType;
      }
      return newRespond;
    });
    this.validRespond = CustomValidators.isValidRespond(newActions);
  }
  fillForm(configData: Config) {
    this.configForm.setValue({
      sessionIn: configData.alert?.session?.in ? configData.alert?.session?.in : '',
      sessionKey: configData.alert?.session?.key ? configData.alert?.session?.key : '',
      usernameIn: configData.alert?.username?.in ? configData.alert?.username?.in : '',
      usernameKey: configData.alert?.username?.key ? configData.alert?.username?.key : '',
      usernameValue: configData.alert?.username?.value ? configData.alert?.username?.value : '',
      server: configData.server ? configData.server : '',
      blocklistReload: configData.blocklistReload ? configData.blocklistReload : ''
    });

    if (this.config.respond) {
      this.actionArray = this.config.respond?.map(({ delay, duration, ...rest }) => {
        let newRespond: FormRespond = { ...rest, delayExtension: 's', durationExtension: 's' };
        if (delay == 'now') {
          newRespond.delay = delay;
          newRespond.delayExtension = 'now';
        }
        else {
          newRespond.delay = delay?.slice(0, -1) as DelayType
          newRespond.delayExtension = delay?.slice(-1) as 's' | 'm' | 'h';
        }
        
        if (duration == 'forever') {
          newRespond.duration == duration; 
          newRespond.durationExtension = 'forever';
        }
        else {
          newRespond.duration = delay?.slice(0, -1) as DurationType
          newRespond.durationExtension = delay?.slice(-1) as 's' | 'm' | 'h';
        }
        return newRespond;
      }) as FormRespond[];
    } else this.actionArray = [];
  }
  async save() {
    if (isEmptyObject(this.config)) {
      this.toastr.error("Cannot save empty json, must have at least one property", 'Error when saving global config');
      return 
    }
    const apiResponse = await this.configService.updateConfig({ pa_id: this.globalState.selectedApp.id, deployed: false, config: this.config });
      if (apiResponse.type == 'error') this.toastr.error(apiResponse.message, "Error when saving global config");
      else {
        this.toastr.success(apiResponse.message, 'Successfully updated global config');
        this.isSync = false;
      }
  }
}
