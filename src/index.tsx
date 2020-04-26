import * as React from "react"
import isFunction from "lodash-es/isFunction"
import pick from "lodash-es/pick"
import StateDesigner, {
  createStateDesignerConfig,
  createStateDesigner,
  StateDesignerConfig,
  StateDesignerWithConfig,
  IEventHandler,
  IEventsConfig,
  IEventConfig,
  IStateConfig,
  IStatesConfig,
  IActionConfig,
  IAsyncResult,
  IConditionConfig,
  IResultConfig,
  ActionsCollection,
  ResultsCollection,
  ConditionsCollection,
  AsyncsCollection,
  Graph,
} from "./StateDesigner"

export { Graph }

export type OnChange<T> = (state: T) => void

type WhenInReducer<T, V> = (
  previousValue: any,
  currentValue: [string, V],
  currentIndex: number,
  array: [string, V][]
) => T

type WhenIn<T = any, V = any> = (
  states: { [key: string]: V },
  reducer?: WhenInReducer<T, V>,
  initial?: T
) => T

export type StateDesignerInfo<D> = {
  data: D
  thenSend: (eventName: string, payload?: any) => () => void
  send: (eventName: string, payload?: any) => void
  graph: Graph.Export<D>
  active: string[]
  isIn(states: string): boolean
  whenIn: WhenIn
  can(event: string, payload?: any): boolean
  reset(): void
}

const defaultDependencies: any[] = []

// Call useStateDesigner with a pre-existing StateDesigner instance
export function useStateDesigner<
  D,
  A extends ActionsCollection<D> | undefined,
  C extends ConditionsCollection<D> | undefined,
  R extends ResultsCollection<D> | undefined,
  Y extends AsyncsCollection<D> | undefined
>(
  options: StateDesigner<D, A, C, R, Y>,
  onChange?: OnChange<StateDesignerInfo<D>>
): StateDesignerInfo<D>
// Call useStateDesigner with configuration for a new StateDesigner instance
export function useStateDesigner<
  D,
  A extends ActionsCollection<D> | undefined,
  C extends ConditionsCollection<D> | undefined,
  R extends ResultsCollection<D> | undefined,
  Y extends AsyncsCollection<D> | undefined
>(
  options: StateDesignerConfig<D, A, C, R, Y>,
  onChange?: OnChange<StateDesignerInfo<D>>,
  dependencies?: any[]
): StateDesignerInfo<D>
/**
 *
 * @param options The configuration object for a new machine, or else an existing machine
 * @param onChange An function to run each time the machine's state changes
 * @param dependencies An array of unrelated values that, when the hook updates, may cause the hook to re-subscribe to its machine, clean up its effect and run the effect again.
 */
export function useStateDesigner<
  D,
  A extends ActionsCollection<D> | undefined,
  C extends ConditionsCollection<D> | undefined,
  R extends ResultsCollection<D> | undefined,
  Y extends AsyncsCollection<D> | undefined
>(
  options: StateDesigner<D, A, C, R, Y> | StateDesignerConfig<D, A, C, R, Y>,
  onChange?: OnChange<StateDesignerInfo<D>>,
  dependencies: any[] = defaultDependencies
): StateDesignerInfo<D> {
  // The hook can accept either a pre-existing machine (so that
  // multiple hooks can share the same data) or the configuration
  // for a new machine (unique to the component calling this hook).
  const machine = React.useRef<StateDesigner<D, A, C, R, Y>>(null as any)

  if (machine.current === null) {
    machine.current =
      options instanceof StateDesigner ? options : new StateDesigner(options)
  }

  const [state, setState] = React.useState<
    Pick<StateDesigner<D, A, C, R, Y>, "data" | "active" | "graph">
  >(pick(machine.current, ["graph", "data", "active"]))

  // Helpers

  const send = React.useCallback((event: string, payload?: any) => {
    machine.current.send(event, payload)
  }, [])

  const thenSend = React.useCallback((event: string, payload?: any) => {
    return function () {
      machine.current.send(event, payload)
    }
  }, [])

  const isIn = React.useCallback((state: string) => {
    return machine.current.isIn(state)
  }, [])

  const whenIn = React.useCallback<WhenIn>(
    (states, reducer = (prev, cur) => [...prev, cur[1]], initial = []) => {
      const { active } = machine.current

      function getValue(value: any) {
        return isFunction(value) ? value() : value
      }

      const entries: [string, any][] = []

      Object.entries(states).forEach(([key, value]) => {
        let v = getValue(value)
        if (key === "root") {
          entries.push([key, v])
        } else {
          if (active.find((v) => v.endsWith("." + key))) {
            entries.push([key, v])
          }
        }
      })

      let returnValue = initial

      entries.forEach(
        (entry, i) => (returnValue = reducer(returnValue, entry, i, entries))
      )

      return returnValue

      // entries.forEach(([key, value]) => {
      //   let v = getValue(value)
      //   if (key === "root") {
      //     returnValue.push(v)
      //   } else {
      //     if (active.find((v) => v.endsWith("." + key))) {
      //       returnValue.push(v)
      //     }
      //   }
      // })

      // switch (type) {
      //   case "array": {
      //     let returnValue = [] as any[]

      //     entries.forEach(([key, value]) => {
      //       let v = getValue(value)
      //       if (key === "root") {
      //         returnValue.push(v)
      //       } else {
      //         if (active.find((v) => v.endsWith("." + key))) {
      //           returnValue.push(v)
      //         }
      //       }
      //     })

      //     return returnValue
      //   }
      //   case "object": {
      //     let returnValue: { [key: string]: any } = {}

      //     entries.forEach(([key, value]) => {
      //       let v = getValue(value)
      //       if (key === "root") {
      //         Object.assign(returnValue, v)
      //       } else {
      //         if (active.find((v) => v.endsWith("." + key))) {
      //           Object.assign(returnValue, v)
      //         }
      //       }
      //     })
      //     return returnValue
      //   }
      //   case "value": {
      //     let returnValue: any = undefined

      //     entries.forEach(([key, value]) => {
      //       let v = getValue(value)
      //       if (key === "root") {
      //         returnValue = v
      //       } else {
      //         if (active.find((v) => v.endsWith("." + key))) {
      //           returnValue = v
      //         }
      //       }
      //     })
      //     return returnValue
      //   }
      //   default: {
      //     return undefined
      //   }
      // }
    },
    []
  )

  const can = React.useCallback((event: string, payload?: any) => {
    return machine.current.can(event, payload)
  }, [])

  const reset = React.useCallback(() => {
    return machine.current.reset()
  }, [])

  // Effect

  React.useLayoutEffect(() => {
    if (!(options instanceof StateDesigner)) {
      machine.current.destroy()
      machine.current = new StateDesigner(options)
    }

    setState(pick(machine.current, ["graph", "data", "active"]))

    return machine.current.subscribe(({ data, active, graph }) => {
      setState({ data, active, graph })
    })
  }, dependencies)

  // Run onChange callback when data changes

  React.useEffect(() => {
    onChange && onChange({ ...state, send, thenSend, isIn, whenIn, can, reset })
  }, [state])

  return { ...(state as any), send, thenSend, isIn, whenIn, can, reset }
}

export {
  StateDesigner,
  StateDesignerConfig,
  createStateDesigner,
  createStateDesignerConfig,
  StateDesignerWithConfig,
}

// Simplified types for export (Are these needed? Maybe for custom machine configuration types?)

export type State<
  D,
  A extends Actions<D>,
  C extends Conditions<D>,
  R extends Results<D>,
  Y extends AsyncResults<D>
> = IStateConfig<D, A, C, R, Y>

export type States<
  D,
  A extends Actions<D>,
  C extends Conditions<D>,
  R extends Results<D>,
  Y extends AsyncResults<D>
> = IStatesConfig<D, A, C, R, Y>

export type Event<
  D,
  A extends Actions<D>,
  C extends Conditions<D>,
  R extends Results<D>,
  Y extends AsyncResults<D>
> = IEventConfig<D, A, C, R, Y>

export type Events<
  D,
  A extends Actions<D>,
  C extends Conditions<D>,
  R extends Results<D>,
  Y extends AsyncResults<D>
> = IEventsConfig<D, A, C, R, Y>

export type EventHandler<D> = IEventHandler<D>

export type Condition<D> = IConditionConfig<D>
export type Conditions<D> = Record<string, Condition<D>>

export type Action<D> = IActionConfig<D>
export type Actions<D> = Record<string, Action<D>>

export type Result<D> = IResultConfig<D>
export type Results<D> = Record<string, Result<D>>

export type AsyncResult<D> = IAsyncResult<D>
export type AsyncResults<D> = Record<string, IAsyncResult<D>>

export type Config<
  D,
  A extends Actions<D>,
  C extends Conditions<D>,
  R extends Results<D>,
  Y extends AsyncResults<D>
> = {
  data: D
  on?: Events<D, A, C, R, Y>
  onEvent?: Event<D, A, C, R, Y>
  initial?: string
  states?: States<D, A, C, R, Y>
  actions?: A
  conditions?: C
  results?: R
}
