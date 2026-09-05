using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
public static class AxieAtlasExtract {
  static double Clamp(double a) { return Math.Max(0,Math.Min(1,a)); }
  static void Blend(double[] d, double[] s, double a) { for(int i=0;i<3;i++) d[i] = d[i]*(1-a)+s[i]*a; }
  static double[] Rgb(Color c) { return new double[] {c.R/255.0,c.G/255.0,c.B/255.0}; }
  public static void Extract(string dir,string name,int x,int y,int w,int h,string[] colors) {
    using(Bitmap main=new Bitmap(Path.Combine(dir,"parts-atlas.png")))
    using(Bitmap line=new Bitmap(Path.Combine(dir,"parts-line.png")))
    using(Bitmap s0=new Bitmap(Path.Combine(dir,"parts-splat0.png")))
    using(Bitmap s1=new Bitmap(Path.Combine(dir,"parts-splat1.png")))
    using(Bitmap output=new Bitmap(w,h,PixelFormat.Format32bppArgb)) {
      double[][] dst=new double[5][]; for(int i=0;i<5;i++) dst[i]=Rgb(ColorTranslator.FromHtml("#"+colors[i]));
      for(int j=0;j<h;j++) for(int k=0;k<w;k++) {
        Color m=main.GetPixel(x+k,y+j), l=line.GetPixel(x+k,y+j), a=s0.GetPixel(x+k,y+j), b=s1.GetPixel(x+k,y+j);
        double ma=m.A/255.0, la=l.A/255.0, ar=a.R/255.0, ag=a.G/255.0, ab=a.B/255.0, br=b.R/255.0, bg=b.G/255.0, bb=b.B/255.0;
        double back=ma*ab, front=ma*(1-ab); double[] c=new double[3], mr=Rgb(m), lr=Rgb(l);
        Blend(c,mr,back); Blend(c,dst[0],ar); Blend(c,dst[1],ag); Blend(c,dst[3],bb); Blend(c,dst[2],bg); Blend(c,dst[3],br); Blend(c,mr,front);
        for(int n=0;n<3;n++) lr[n]*=dst[4][n]; Blend(c,lr,la);
        double alpha=Clamp(back+ar+ag+bg+bb+br+front+la);
        if(alpha>0) output.SetPixel(k,j,Color.FromArgb((int)Math.Round(alpha*255),(int)Math.Round(Clamp(c[0]/alpha)*255),(int)Math.Round(Clamp(c[1]/alpha)*255),(int)Math.Round(Clamp(c[2]/alpha)*255)));
      }
      output.Save(Path.Combine(dir,name),ImageFormat.Png);
    }
  }
}
