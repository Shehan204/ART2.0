export class CompassService {
  public heading: number | null = null;
  private listenerActive = false;

  public requiresPermission(): boolean {
    return typeof (DeviceOrientationEvent as any) !== 'undefined' && 
           typeof (DeviceOrientationEvent as any).requestPermission === 'function';
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.requiresPermission()) return true;
    
    try {
      const permissionState = await (DeviceOrientationEvent as any).requestPermission();
      return permissionState === 'granted';
    } catch (e) {
      console.error("Error requesting compass permission:", e);
      return false;
    }
  }

  public start() {
    if (this.listenerActive) return;

    if (this.requiresPermission()) {
      window.addEventListener('deviceorientation', this.handleOrientation, true);
    } else {
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', this.handleOrientationAbsolute, true);
      } else {
        window.addEventListener('deviceorientation', this.handleOrientation, true);
      }
    }
    this.listenerActive = true;
  }

  public stop() {
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('deviceorientationabsolute', this.handleOrientationAbsolute, true);
    this.listenerActive = false;
  }

  private handleOrientation = (event: any) => {
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      // iOS
      this.heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android fallback
      this.heading = 360 - event.alpha;
    }
  };

  private handleOrientationAbsolute = (event: any) => {
    if (event.alpha !== null) {
      // Android absolute orientation
      this.heading = 360 - event.alpha;
    }
  };
}

export const compassService = new CompassService();
