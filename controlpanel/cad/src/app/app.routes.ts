import { Routes } from '@angular/router';
import { AddDecoyComponent } from './pages/add-decoy/add-decoy.component';
import { ListDecoyComponent } from './pages/list-decoy/list-decoy.component';
import { InjectionComponent } from './pages/add-decoy/injection/injection.component';
import { DetectionComponent } from './pages/add-decoy/detection/detection.component';
import { AlertActionComponent } from './pages/add-decoy/alert-action/alert-action.component';
import { ReviewComponent } from './pages/add-decoy/review/review.component';
import { validateDecoyFormGuard } from './guards/deactivate/validate-decoy-form.guard';
import { returnBackReviewGuard } from './guards/deactivate/return-back-review.guard';
import { LogsComponent } from './pages/logs/logs.component';
import { ConfigComponent } from './pages/config/config.component';

export const routes: Routes = [{
    path: 'decoy',
    children: [{
        path: 'new',
        component: AddDecoyComponent,
        children: [{
            path: '',
            redirectTo: 'injection',
            pathMatch: 'full',
        },
        {
            path: 'injection',
            component: InjectionComponent,
            canDeactivate: [validateDecoyFormGuard]
        }, 
        {
            path: 'detection',
            component: DetectionComponent,
            canDeactivate: [validateDecoyFormGuard]
        },
        {
            path: 'alert-action',
            component: AlertActionComponent,
            canDeactivate: [validateDecoyFormGuard]
        },
        {
            path: 'review',
            component: ReviewComponent,
            canDeactivate: [returnBackReviewGuard]
        }]
    },
    {
        path: 'list',
        component: ListDecoyComponent
    },
    {
        path: ':id',
        component: AddDecoyComponent,
        children: [
        {
            path: 'injection',
            component: InjectionComponent,
            canDeactivate: [validateDecoyFormGuard]
        }, 
        {
            path: 'detection',
            component: DetectionComponent,
            canDeactivate: [validateDecoyFormGuard]
        },
        {
            path: 'alert-action',
            component: AlertActionComponent,
            canDeactivate: [validateDecoyFormGuard]
        },
        {
            path: 'review',
            component: ReviewComponent,
            canDeactivate: [returnBackReviewGuard]
        }]
    }]
},
{
    path: 'logs',
    component: LogsComponent
},
{
    path: 'config',
    component: ConfigComponent
}];
