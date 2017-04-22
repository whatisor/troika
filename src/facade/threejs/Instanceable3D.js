import {Object3D} from 'three'
import Object3DFacade from './Object3D'

/**
 * Instanceable3DFacade is a specialized Object3DFacade that renders using GPU
 * instancing. This can give a significant performance boost for objects that
 * are rendered many thousands of times in a scene.
 *
 * Usage is nearly identical to an Object3DFacade, but instead of creating a
 * `threeObject` in the constructor, you set its `instancedThreeObject` property
 * to a common shared Mesh object. Any other Instanceable3DFacades in the scene
 * that reference the same `instancedThreeObject` will be batched together and
 * rendered using a single GPU draw call. The `instancedThreeObject` can be
 * changed at any time, allowing dynamic appearance changes by swapping out the
 * referenced mesh.
 */
class Instanceable3DFacade extends Object3DFacade {
  constructor(parent) {
    let obj = new Object3D()

    // Trigger scene graph size optimizations
    obj.isRenderable = false

    // Visibility change affects batching so listen for changes
    obj.$troikaVisible = obj.visible
    Object.defineProperty(obj, 'visible', visibilityPropDef)

    super(parent, obj)
    this.notifyWorld('instanceableAdded')
  }

  set instancedThreeObject(obj) {
    if (obj !== this._instancedThreeObject) {
      this._instancedThreeObject = obj
      this.notifyWorld('instanceableChanged')
    }
  }
  get instancedThreeObject() {
    return this._instancedThreeObject
  }

  updateMatrices() {
    super.updateMatrices()
    // If the world matrix changed, we must notify the instancing manager
    if (this._worldMatrixVersion !== this._lastInstancedMatrixVersion) {
      if (this.threeObject.$troikaVisible) {
        this.notifyWorld('instanceableMatrixChanged')
      }
      this._lastInstancedMatrixVersion = this._worldMatrixVersion
    }
  }

  destructor() {
    this.notifyWorld('instanceableRemoved')
    super.destructor()
  }

  // Custom raycasting based on current geometry and transform
  raycast(raycaster) {
    let instancedObj = this.instancedThreeObject
    if (instancedObj) {
      let origMatrix = instancedObj.matrixWorld
      instancedObj.matrixWorld = this.threeObject.matrixWorld
      let result = this._raycastObject(instancedObj, raycaster) //use optimized method
      instancedObj.matrixWorld = origMatrix
      return result
    }
    return null
  }
}

const visibilityPropDef = {
  set(visible) {
    if (visible !== this.$troikaVisible) {
      this.$troikaVisible = visible
      this.$facade.notifyWorld('instanceableChanged')
    }
  },
  get() {
    return this.$troikaVisible
  }
}

export default Instanceable3DFacade
