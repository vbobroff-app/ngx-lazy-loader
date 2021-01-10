import { of } from 'rxjs';
import { Observable, Subject } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

export abstract class LazyLoader<M, T> {

    private loadFlag: boolean;
    private channels$: { key: string, subject: Subject<T | M> }[] = [];

    private module: M = undefined;

    abstract load(): Observable<M>;
    abstract extract(module: M, key?: string): T;

    place(state: M): void {
        this.module = state;
    }

    require(key: string): Observable<T> {
        this.loadFlag = true;
        return this.load().pipe(
            map(module => {
                this.module = module;
                return this.extract(module, key);
            }),
            finalize(() => {
                this.channels$.map(flow => flow.key
                    ? flow.subject.next(this.extract(this.module, flow.key))
                    : flow.subject.next(this.module));
            })
        );
    }

    import(key?: string, reload?: boolean): Observable<M | T> | Subject<M | T> {
        if (reload && !this.module || !this.loadFlag) {
            return this.require(key);
        } else if (!!this.module) {
            return of(this.extract(this.module, key));
        }
        const subject = key ? new Subject<T>() : new Subject<M>();
        this.channels$.push({ key, subject });
        return subject;
    }
}
