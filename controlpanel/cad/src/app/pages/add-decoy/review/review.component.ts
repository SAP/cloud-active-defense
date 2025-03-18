import { Component, inject } from '@angular/core';
import { DecoyService } from '../../../services/decoy.service';
import { Decoy } from '../../../models/decoy';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { ReturnBackReviewDeactivate } from '../../../guards/deactivate/return-back-review.guard';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { UUID } from '../../../models/types';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss'
})
export class ReviewComponent implements ReturnBackReviewDeactivate {
  decoy: Decoy = {decoy:{}};
  reviewText = "";
  decoySubscription?: Subscription;
  decoyId: UUID = "";

  constructor(private decoyService: DecoyService, private toastr: ToastrService, private router: Router, private activatedRoute: ActivatedRoute) {
    this.decoySubscription = this.decoyService.decoy$.subscribe(data => {
        this.decoy = data;
    })
    this.activatedRoute.parent?.params.subscribe(async params => this.decoyId = params['id']);
    if (!this.decoy.detect && !this.decoy.inject) this.router.navigate(['../injection'], { relativeTo: this.activatedRoute });
    this.reviewText = `Your configuration ${this.generateInjectText()} ${this.decoy.inject && this.decoy.detect ? ', it also' : ''} ${this.generateDetectText()}`
  }

  returnBackReview(nextRoute: string, currentRoute: string): Observable<boolean> | Promise<boolean> | boolean {
    if (nextRoute.includes('injection') || nextRoute.includes('detection')) return true;
    if (nextRoute.includes('alert-action') && this.decoy.detect) return true;
    if (currentRoute.includes('review') && nextRoute.includes('alert-action') && !this.decoy.detect) {
      this.toastr.warning("Cannot go to alert/action page, detect is not set yet", 'Not allowed');
      return false;
    }
    return confirm("Are you sure to leave this page? All progress will be lost");
  }

  generateInjectText(): string {
    if (!this.decoy.inject) return '';
    let decoy = '';
    if (this.decoy.decoy.string) decoy = `"${this.decoy.decoy.string}"`
    else if ((this.decoy.decoy.value == '' || this.decoy.decoy.value == undefined || this.decoy.decoy.dynamicValue == '' || this.decoy.decoy.dynamicValue == undefined) && this.decoy.inject?.store.as == 'body') decoy = this.decoy.decoy.key!;
    else decoy = `"${this.decoy.decoy.value || this.decoy.decoy.dynamicValue}" in the "${this.decoy.decoy.key || this.decoy.decoy.dynamicKey}"`
    
    let as = '';
    if (this.decoy.inject.store.as == 'body' ) as = "in the body";
    else as = this.decoy.inject.store.as;

    let request = '';
    if (this.decoy.inject?.store.inRequest)
      if (this.decoy.inject.store.inRequest == '.*') request = "for every request";
      else request = `when requesting "${this.decoy.inject.store.inRequest}"`;
    else if (this.decoy.inject?.store.inResponse)
      if (this.decoy.inject.store.inResponse == '.*') request = "for every response";
      else request = `in the response when requesting "${this.decoy.inject.store.inResponse}"`;

    let verb = '';
    if (!this.decoy.inject.store.withVerb) verb = "";
    else verb = `with the verb ${this.decoy.inject.store.withVerb}`;
    
    let at = '';
    if (this.decoy.inject?.store.at?.method){
      switch (this.decoy.inject?.store.at?.method) {
        case 'character':
          at = `at character number ${this.decoy.inject?.store.at?.property}`;
          break;
        case 'line':
          at = `at line ${this.decoy.inject?.store.at?.property}`;
          break;
        case 'replace':
          at = `replacing first occurence of "${this.decoy.inject?.store.at?.property}"`;
          break;
        case 'always':
          at = `replacing every occurence of "${this.decoy.inject?.store.at?.property}"`
          break;
        case 'after':
          at = `after "${this.decoy.inject?.store.at?.property}"`;
          break;
        case 'before':
          at = `before "${this.decoy.inject?.store.at?.property}"`;
          break;
      }
    }

    let whenTrue: string[] = [];
    if (this.decoy.inject.whenTrue) {
      for (const when of this.decoy.inject.whenTrue) {
        let whenIn;
        if (when.in == 'payload') whenIn = "in the payload";
        else whenIn = `the ${when.in}`;

        let keyValue;
        if (when.in == 'url') keyValue = `is "${when.value}"`;
        else if (when.in == 'payload' && !when.key && when.value) keyValue = `"${when.value}" is found`;
        else keyValue = `"${when.key}" equals "${when.value}"`;

        whenTrue.push(`${whenIn} ${keyValue}`);
      }
    }

    let whenFalse: string[] = [];
    if (this.decoy.inject.whenFalse) {
      for (const when of this.decoy.inject.whenFalse) {
        let whenIn;
        if (when.in == 'payload') whenIn = "in the payload";
        else whenIn = `the ${when.in}`;

        let keyValue;
        if (when.in == 'url') keyValue = `is not "${when.value}"`;
        else if (when.in == 'payload' && !when.key && when.value) keyValue = `"${when.value}" is not found`;
        else keyValue = `"${when.key}" does not equal "${when.value}"`;

        whenFalse.push(`${whenIn} ${keyValue}`);
      }
    }

    return `inject the decoy ${decoy} ${as} ${at} ${request} ${verb} ${whenTrue.length ? 'only when ' + whenTrue.join() : ''} ${whenTrue.length && whenFalse.length ? 'and' : ''} ${whenFalse.length ? 'only when ' + whenFalse.join() : ''}`;
  }

  generateDetectText(): string {
    if (!this.decoy.detect) return '';
    let decoyKey = `"${this.decoy.decoy.key || this.decoy.decoy.dynamicKey}"`;
    
    let decoyValue = `${this.decoy.detect?.seek.in !== 'url' ? '"' + this.decoy.decoy.value + '"' || '"' + this.decoy.decoy.dynamicValue + '"' : ''}`;

    let injectIn = '';
    if (this.decoy.detect?.seek.in == 'payload') injectIn = "in the payload, ";
    else injectIn = `the ${this.decoy.detect?.seek.in}`;

    let request = '';
    if (this.decoy.detect?.seek.inRequest)
      if (this.decoy.detect.seek.inRequest == '.*') request = "for every request";
      else request = `when requesting "${this.decoy.detect.seek.inRequest}"`;
    else if (this.decoy.detect?.seek.inResponse)
      if (this.decoy.detect.seek.inResponse == '.*') request = "for every response";
      else request = `in the response when requesting "${this.decoy.detect.seek.inResponse}"`;
    
    const whenAlert: string[] = [];
    let whenAlertText = '';
    if (this.decoy.detect?.alert?.whenAbsent) whenAlert.push('absent');
    if (this.decoy.detect?.alert?.whenComplete) whenAlert.push('completed');
    if(this.decoy.detect?.alert?.whenModified) whenAlert.push('modified');
    if(this.decoy.detect?.alert?.whenSeen) whenAlert.push('seen');
    if (whenAlert.length) {
      const alertsNotUsingValue = whenAlert.filter(alert => alert == 'absent' || alert == 'seen');
      const alertsUsingValue = whenAlert.filter(alert => alert == 'modified' || alert == 'completed');
      if (alertsUsingValue.length) {
        whenAlertText = `is ${alertsUsingValue.join(' or ')} ${this.decoy.detect?.seek.in !== 'url' ? "from it's initial value" : ''} ${decoyValue}`;
      }
      if (alertsNotUsingValue.length) {
        whenAlertText += `${alertsUsingValue.length ? ' or when' : ''} is ${alertsNotUsingValue.join(' or ')}`;
      }
    }

    const respondText: string[] = [];
    if (this.decoy.detect?.respond) {
      for (const respond of this.decoy.detect.respond) {
        let behavior;
        if (respond.behavior == 'error') behavior = "send error 500";
        else if (respond.behavior == 'throttle') behavior = `${respond.behavior} ${respond.property ? respond.property?.includes('-') ? 'between ' + respond.property : respond.property : 'between 30-120'} seconds`;
        else behavior = respond.behavior;

        let delay;
        if (respond.delay == 'now' || !respond.delay) delay = 'now';
        else {
          let extension = respond.delay?.slice(-1);
          switch (extension) {
            case 's':
              extension = 'seconds';
              break;
            case 'm':
              extension = 'minutes';
              break;
            case 'h':
              extension = 'hours';
              break;
          }
          delay = `delayed by ${respond.delay?.slice(0, -1)} ${extension}`
        }

        let duration;
        if (respond.duration == 'forever' || !respond.duration) duration = 'forever';
        else {
          let extension = respond.duration?.slice(-1);
          switch (extension) {
            case 's':
              extension = 'seconds';
              break;
            case 'm':
              extension = 'minutes';
              break;
            case 'h':
              extension = 'hours';
              break;
          }
          duration = `for ${respond.duration?.slice(0, -1)} ${extension}`
        }

        let source;
        const lastSourceIndex = respond.source.lastIndexOf(',');
        if (lastSourceIndex === -1) source = respond.source;
        else source = `${respond.source.substring(0, lastSourceIndex)} and ${respond.source.substring(lastSourceIndex + 1)}`;
        
        respondText.push(`${behavior} ${delay} for user with same ${source} ${duration}`);
      }
    }

    return `send an ${this.decoy.detect?.alert?.severity} alert when ${injectIn} ${decoyKey} ${whenAlertText} ${request} ${respondText.length ? 'and ' + respondText.join(' or ') : ''}`;
  }

  async save() {
    if (!this.decoyId) {
      const apiResponse = await this.decoyService.addNewDecoy();
      if (apiResponse.type == 'error') this.toastr.error(apiResponse.message, "Error when saving decoy");
      else {
        this.toastr.success(apiResponse.message, 'Successfully created Decoy');
        this.router.navigate(['decoy/list']);
      }
    } else {
      const apiResponse = await this.decoyService.saveDecoy(this.decoyId, this.decoy);
      if (apiResponse.type == 'error') this.toastr.error(apiResponse.message, "Error when saving decoy");
      else {
        this.toastr.success(apiResponse.message, 'Successfully saved Decoy');
        this.router.navigate(['decoy/list']);
      }
    }
  }
}
