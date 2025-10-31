declare module "*.png" {
    const value: any;
    export default value;
  }
  // needed to recognise png as modules apparently so we can do import ../image.png