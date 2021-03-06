using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using System.Windows.Forms;
using System.IO;
using System.Threading;
using System.Xml.Serialization;
using System.Runtime.InteropServices;
using Microsoft.DirectX;
using Microsoft.DirectX.Direct3D;
using System.Net;
using System.Diagnostics;


namespace RMU1
{
    public enum HRESULT
    {
        S_OK = 0, 
        S_ERROR = 1,
		S_CANCEL = 2
    }
	
    public enum MODE
	{
			Scan, Open, Save, Edit, Shift, NotActive, Cancel
	}

    public struct MODE_EDIT
    {
        private Boolean isShift;
        public Boolean Shift
        {
            get { return isShift; }
            set { isShift = value; }
        }
        private Boolean isInverse;
        public Boolean Inverse
        {
            get { return isInverse; }
            set { isInverse = value; }
        }
        private Boolean isContrast;
        public Boolean Contrast
        {
            get { return isContrast; }
            set { isContrast = value; }
        }
        private Boolean isNone;
        public Boolean None
        {
            get { return isNone; }
            set { isNone = value; }
        }
        private Int16 shift;
        public Int16 ShiftValue
        {
            get { return shift; }
            set { shift = value; }
        }
        private Int16 contrast;
        public Int16 ContrastValue
        {
            get { return contrast; }
            set { contrast = value; }
        }
    }
      
    /*    
    *	Init RMU1 device on server to run scanning: 
    */
    public delegate int DelegateConnectionDevice(StringBuilder serverUriP);
    public delegate int DelegateInitDevice(StringBuilder serverUriP, Int32 param1, Int32 param2, double param3, Int32 param4, Int32 param5, Int32 param6, Int32 param7, StringBuilder dataFileNameP);
    public delegate int DelegateStopDevice(StringBuilder serverUriP);

    public delegate Bitmap DelegateEditBitmap(out HRESULT Res, out Int16 item);               
   
    public partial class FData : Form
    {
		// Header file size 
		public const int HEADER_SIZE = 255;

        [DllImport("RMU1Client.DLL")]
        // XML-RPC Client to call procedure of the server connection check 
        static public extern int connection_device(
            StringBuilder serverUrlP // server URL 
        );

        [DllImport("RMU1Client.DLL")]
        // XML-RPC Client to call procedure of the RMU1 device initialisation
        static public extern int init_device(
            StringBuilder serverUrlP, // server URL 
            Int32 framesCountP,  // количество кадров
            Int32 volltageSourceP, // напряжение
            double currentSourceP, // сила тока
            Int32 expositionTimeFrameP, // время экспозиции кадра
            Int32 targetTimeFrameP, // время позиционирования
            Int32 overlapZoneP, // зона перекрытия кадра
            Int32 reverseP, // boolean type 0 || 1
            StringBuilder dataFileNameP // префикс названия временных файлов
        );
        
        [DllImport("RMU1Client.DLL")]
        static public extern int stop_device(
            StringBuilder serverUrlP // server URL 
        );

        // Variable to detection if an error occures by XML-RPC init device
        static public int ConnectionResult = 0;
        // Variable to detection sinchronized XML-RPC call processing
        static public bool connectionCheckProcessing = false;
        static public long ScanResultError = 0;
        static public HRESULT Result;

        static public UInt32[] buf_total_int; 
         
        // Размер кадра при изображении
        static public Int16 height_frame_bmp, width_frame_bmp;
        static public Int16 coefficient = 6; 
		static public MODE Mode;
        static private List<Int16> semaforScreenItems;

        static public Bitmap[] bmp;
        static private Bitmap[] bmpInverse;
        static private Bitmap[] bmpClone;
        
        //Remote initialization device
        DelegateConnectionDevice delegateConnectionDevice = new DelegateConnectionDevice(connection_device);
        AsyncCallback callbackConnectionDevice = new AsyncCallback(connectionDeviceResult);
        DelegateInitDevice delegateInitDevice = new DelegateInitDevice(init_device);
        AsyncCallback callbackInitDevice = new AsyncCallback(InitDeviceResult);
        DelegateStopDevice delegateStopDevice = new DelegateStopDevice(stop_device);

        // Reading remote file is dismissed by timeout after 20 sec
        static System.Timers.Timer stateTimer = new System.Timers.Timer(100000);

 		// Adjustment
        static public long nSumBufTotalInt = 0;
		static public long nAvgBufTotalInt = 1;
		static public List<long[]> arAvgFrame; // [0]- sum; [1]-avg

        // DirectX device
        private Microsoft.DirectX.Direct3D.Device device = null;
        private PresentParameters presentParams;
        private Surface back = null;

       // Scan variables
        private Int16 num_diods, total_read; // Размер кадра
	    private int framesCount = 5;// Количество кадров
        private int current_frame = 0;
        private String strAutoFolderName;
        private String[] commentText;

        // Bitmap properties
        private Int16 itemWidth; // Width bitmap 
        private Int16 itemWidthLast; // Width last bitmap
        private Int16 itemsCount;

        // Draw 
        private Image im;
        private GraphicsUnit units = GraphicsUnit.Pixel;
        private ImageAttributes imageAttr = new ImageAttributes();
        System.Drawing.Graphics g;
        private Rectangle rectScreen = new Rectangle();
        private Rectangle rectDeskShow = new Rectangle();
        private Rectangle rectScrShow = new Rectangle();
        private Rectangle rectDrawReversible = new Rectangle();
        private int leftScreenHeight;
        
        // Edit
        private int delta = 45, delta_default = 100;
        private bool bShiftScroll = false;
        private bool bContrastScroll = false;
        private int oldShiftValue = 0; // It is necessary for determine to set -1 or 1 by shift = 0

        // Scrollbar
        private int oldValue = 0;

        // Panel Depth
        private int widthPanelDepth = 300;
        private Rectangle[] rectDepth;
        private Point crossSection;
        private int cnt_paint = 0;
        private PointF scaleDepth = new PointF(0.25f, 1.0f);
        private Point oldPosPanelDepth;

        private bool isDragging = false, isDrawLine = false;
        private Boolean isDrag = false;
        private Point startPoint;

        // Serialize
        [XmlRoot()]
        public struct structSerializeObject
        {
            private String currentFolderName;
            public String CurrentFolderName
            {
                get { return currentFolderName; }
                set { currentFolderName = value; }
            }
            private String scanDataFolderName;
            public String ScanDataFolderName
            {
                get { return scanDataFolderName; }
                set { scanDataFolderName = value; }
            }
            private int diameter;
            [XmlElement()]
            public int PipeDiameter
            {
                get { return diameter; }
                set { diameter = value; }
            }
            private int wall;
            [XmlElement()]
            public int PipeWall
            {
                get { return wall; }
                set { wall = value; }
            }
            private int volltage;
            [XmlElement()]
            public int VolltageSource
            {
                get { return volltage; }
                set { volltage = value; }
            }
            private double current;
            [XmlElement()]
            public double CurrentSource
            {
                get { return current; }
                set { current = value; }
            }
            private int overlap;
            [XmlElement()]
            public int OverlapZone
            {
                get { return overlap; }
                set { overlap = value; }
            }
            private int crop;
            [XmlElement()]
            public int CropZone
            {
                get { return crop; }
                set { crop = value; }
            }
            private int exposition;
            [XmlElement()]
            public int ExpositionTimeFrame
            {
                get { return exposition; }
                set { exposition = value; }
            }
            private int target;
            [XmlElement()]
            public int TargetTimeFrame
            {
                get { return target; }
                set { target = value; }
            }
            private bool reverse;
            [XmlElement()]
            public bool Reverse
            {
                get { return reverse; }
                set { reverse = value; }
            }
            private int frequency;
            [XmlElement()]
            public int DeviceFreq
            {
                get { return frequency; }
                set { frequency = value; }
            }
            private int freq_hand;
            [XmlElement()]
            public int DeviceFreqHand
            {
                get { return freq_hand; }
                set { freq_hand = value; }
            }
            private bool positive;
            [XmlElement()]
            public bool DataPositive
            {
                get { return positive; }
                set { positive = value; }
            }
/*            private bool math_acummulate;
            [XmlElement()]
            public bool MathAccumulate
            {
                get { return math_acummulate; }
                set { math_acummulate = value; }
            }
            private int math_interap;
            [XmlElement()]
            public int MathInterap
            {
                get { return math_interap; }
                set { math_interap = value; }
            }
*/			private bool adjustment;
			[XmlElement()]
			public bool UseAdjustment
			{
				get { return adjustment; }
				set { adjustment = value; }
			}
			private Int16 width;
            [XmlElement()]
            public Int16 StreidWidth
            {
                get { return width; }
                set { width = value; }
            }
            private Int16 height;
            [XmlElement()]
            public Int16 StreidHeight
            {
                get { return height; }
                set { height = value; }
            }
            private String strServerUri;
            public String ServerUri
            {
                get { return strServerUri; }
                set { strServerUri = value; }
            }
            private String strServerPath;
            public String ServerPath
            {
                get { return strServerPath; }
                set { strServerPath = value; }
            }
            private String strServerScanDataFolderName;
            public String ServerScanDataFolderName
            {
                get { return strServerScanDataFolderName; }
                set { strServerScanDataFolderName = value; }
            }
        }
        public structSerializeObject stSerOb;
         
        // Background
        private   UInt32[] buf_background, buf_ampf;
        public uint sum_bg;
 
        
        public void InitializeGraphics()
        {
            try
            {
                this.SetStyle(ControlStyles.Opaque | ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);
                this.UpdateStyles();
                presentParams = new PresentParameters();
                presentParams.Windowed = true;
                presentParams.SwapEffect = SwapEffect.Flip;
                presentParams.BackBufferCount = 1;
                presentParams.BackBufferFormat = Format.Unknown;
                presentParams.BackBufferWidth = System.Windows.Forms.Screen.PrimaryScreen.WorkingArea.Width;// this.Width;
                presentParams.PresentFlag = PresentFlag.LockableBackBuffer;

                device = new Device(0, DeviceType.Hardware, this, CreateFlags.SoftwareVertexProcessing, presentParams);
            }
            catch (InvalidCallException)
            {
                MessageBox.Show(String.Format("Ошибка при загрузке"));
            }
            catch (DirectXException)
            {
                MessageBox.Show(String.Format("Ошибка при загрузке DirectX {0}", DirectXException.LastError.ToString()));
            }
        }

        public FData()
        {
            InitializeComponent();
            InitializeGraphics();
            timerConnection.Start();
        }

        private void FData_Load(object sender, EventArgs e)
        {
            String xmlFileFolder = System.AppDomain.CurrentDomain.BaseDirectory + @"RMU1Data.xml";
            DeserializeObject(xmlFileFolder);
			Mode = MODE.NotActive;
            num_diods = 511;// 180;short
            total_read = 1024; // buf_total_length / num_diods;// 2050;  short// 3000;
            width_frame_bmp = (Int16)((stSerOb.CropZone != 0) ? (stSerOb.StreidWidth - stSerOb.CropZone *2) : stSerOb.StreidWidth);
            height_frame_bmp = (stSerOb.StreidHeight == 0) ? total_read : stSerOb.StreidHeight;

            nShift.Value = (int)1;
			nBrightness.Value = (int)10;
			chBxInvert.Checked = true;

            Rectangle rect = new Rectangle();
            rect = System.Windows.Forms.Screen.PrimaryScreen.WorkingArea;
            rect.Height -= SystemInformation.CaptionHeight;
            pictureBoxLeftTop.Left = 3;
            pictureBoxLeftTop.Top = this.toolStrip1.Height + menuStrip1.Height;

            pictureBoxLeftMiddle.Left = pictureBoxLeftTop.Left;
            pictureBoxLeftMiddle.Top = pictureBoxLeftTop.Top + pictureBoxLeftTop.Height;
            pictureBoxLeftMiddle.Height = rect.Height - (pictureBoxLeftTop.Height + pictureBoxLeftBottom.Height + pictureBoxLeftTop.Top + 3);

            pictureBoxLeftBottom.Left = pictureBoxLeftTop.Left;
            pictureBoxLeftBottom.Top = pictureBoxLeftMiddle.Top + pictureBoxLeftMiddle.Height;

            pictureBoxTop.Left = pictureBoxLeftTop.Location.X + pictureBoxLeftTop.Width;
            pictureBoxTop.Top = pictureBoxLeftTop.Top;
            pictureBoxTop.Width = rect.Width - pictureBoxLeftTop.Width - pictureBoxRightTop.Width - pictureBoxLeftTop.Location.X - 3;

            pictureBoxBottom.Left = pictureBoxTop.Left;
            pictureBoxBottom.Top = pictureBoxLeftBottom.Bottom - pictureBoxBottom.Height;
            pictureBoxBottom.Width = pictureBoxTop.Width;

            pictureBoxRightTop.Left = pictureBoxLeftTop.Location.X + pictureBoxTop.Width + pictureBoxLeftTop.Width;
            pictureBoxRightTop.Top = pictureBoxLeftTop.Top;
            pictureBoxRightMiddle.Left = pictureBoxRightTop.Left;
            pictureBoxRightMiddle.Top = pictureBoxRightTop.Top + pictureBoxRightTop.Height;
            pictureBoxRightMiddle.Height = rect.Height - (pictureBoxRightTop.Height + pictureBoxRightBottom.Height + pictureBoxRightTop.Top + 3);
            pictureBoxRightBottom.Left = pictureBoxRightTop.Left;
            pictureBoxRightBottom.Top = pictureBoxRightMiddle.Top + pictureBoxRightMiddle.Height;

            rectScreen.Location = new Point(pictureBoxLeftTop.Location.X + pictureBoxLeftTop.Width + 2, pictureBoxLeftTop.Location.Y + pictureBoxTop.Height + 1);
            leftScreenHeight = pictureBoxLeftTop.Height + pictureBoxLeftMiddle.Height + pictureBoxLeftBottom.Height;
            SetScreenSize(leftScreenHeight);
			
			int offset = (rectScreen.Height - height_frame_bmp) / 2;
            rectDeskShow.Location = new Point(rectScreen.Location.X, rectScreen.Location.Y + offset);
            rectDeskShow.Size = new Size(rectScreen.Width, height_frame_bmp);
            rectScrShow.Size = new Size(rectScreen.Width, height_frame_bmp);

            hScrollBar.Location = new Point(pictureBoxLeftTop.Location.X + pictureBoxLeftTop.Width + 1, pictureBoxBottom.Top - hScrollBar.Height - 1);
            vScrollBar.Maximum = height_frame_bmp;
            vScrollBar.Size = new Size(16, rectScreen.Height - (hScrollBar.Visible == true ? hScrollBar.Height : 0));

            panelColor.Location = new Point(pictureBoxRightTop.Location.X - panelColor.Width , pictureBoxTop.Bottom + 1);
            panelColor.Height = rectScreen.Height + hScrollBar.Height + 8;// + hScrollBar.Height;- 1
            rectDepth = new Rectangle[height_frame_bmp];
            panelDepth.Size = new Size(widthPanelDepth, rectDeskShow.Height + 6);
            
            startPoint = new Point(0, 0);
            tbShowShift.Value = 0;
			arAvgFrame = new List<long[]>();

            Control.CheckForIllegalCrossThreadCalls = false;
            progressBar.Location = new Point(pictureBoxBottom.Location.X + (pictureBoxBottom.Width / 2), pictureBoxBottom.Location.Y + 15);
            progressBar.Value = 0;
            progressBar.Visible = false;

            pictureBoxConnection.Location = new Point(pictureBoxBottom.Location.X + pictureBoxBottom.Width - 70, pictureBoxBottom.Location.Y + 10);

            backgroundWorker.CancelAsync();
        }

        private void SetScreenSize(int height)
        {
            rectScreen.Size = new Size(pictureBoxRightMiddle.Left - pictureBoxTop.Left - (vScrollBar.Visible == true ? vScrollBar.Width : 0) - (panelColor.Visible == true ? panelColor.Width : 0), height - pictureBoxTop.Height - pictureBoxBottom.Height - (hScrollBar.Visible == true ? hScrollBar.Height : 0) - 25);
            hScrollBar.Size = new Size(rectScreen.Width - 1, 16);
            if ((bmp != null) && (bmp[0] != null) && (bmp[bmp.Length - 1] != null))
            {
                int width = ((bmp.Length - 1) * bmp[0].Width) + bmp[bmp.Length - 1].Width;
                hScrollBar.Maximum = (width * delta) / delta_default - rectScreen.Width + 10;
            }
            if (vScrollBar.Visible)
            {
                vScrollBar.Location = new Point(pictureBoxRightTop.Location.X - vScrollBar.Width - (panelColor.Visible == true ? panelColor.Width : 0) - 1, pictureBoxTop.Bottom + 1);
            }
        }

        private void ButtonShow_Click(object sender, EventArgs e)
        {
            ClearScreen(2);
        }
  
        private void ClearScreen(int paramCall)  // true by scan
        {
            Result = HRESULT.S_OK;
            progressBar.Visible = (Mode == MODE.Scan);
            progressBar.Value = 0;
            switch (paramCall)
            {
                case 1: 
	            case 2: //after work
	                delta = 45;   
	            break;
                case 3://by open/close panel for image edit
	               delta = delta;
                break;
                default:
                break;
            }
	        double oldHMax = hScrollBar.Maximum;

            panelColor.Visible = (Mode == MODE.Edit);

            SetScreenSize(leftScreenHeight);
            if (Mode == MODE.Scan)
            {
               hScrollBar.Visible = false;
               timerConnection.Stop();
               im = null;
               bmp = null;
             }
            else
            {
                timerConnection.Start();
                if (im != null)
                {
                   int width = 0;
                   if ((bmp != null) && (bmp.Length != 0))
                   {
                       width = ((bmp.Length - 1) * bmp[0].Width) + bmp[bmp.Length - 1].Width;
                   }
                   hScrollBar.Visible = (((width * delta) / delta_default) + 10 > rectScreen.Width) ? true : false;
               }
            }
            
            if ((Mode == MODE.Scan) || (Mode == MODE.Open))
            {
                panelDepth.Visible = false;
            }
            
            switch (paramCall) 
            {
               case 1: //after work
                   hScrollBar.Value = (hScrollBar.Visible ? hScrollBar.Maximum : hScrollBar.Minimum);
	           break;
               case 2://by open file
                   hScrollBar.Value = hScrollBar.Minimum;                                             
	           break;
               case 3://by open/close panel for image edit
	               double oldHValue = hScrollBar.Value;
	               ChangeValueScroll(oldHMax, oldHValue);
	           break;
            }
            
            vScrollBar.Visible = false;
            vScrollBar.Value = 0;
            vScrollBar.Maximum = height_frame_bmp;

            ButtonOpen.Enabled = (Mode != MODE.Scan);
            ButtonShow.Enabled = (Mode != MODE.Scan);
            ButtonSave.Enabled = (Mode != MODE.Scan);
            ButtonShow.Enabled = (Mode != MODE.Scan);
            ButtonHelp.Enabled = (Mode != MODE.Scan);
            ButtonPlus.Visible = (Mode != MODE.Scan);
            ButtonMinus.Visible = (Mode != MODE.Scan);
            ButtonEdit.Visible = (Mode != MODE.Scan);

            beginToolStripMenuItem.Checked = (Mode == MODE.Scan);
            endToolStripMenuItem.Enabled = (Mode == MODE.Scan);
            showToolStripMenuItem.Enabled = (Mode != MODE.Scan);
            endToolStripMenuItem.Checked = (Mode != MODE.Scan);
            toolStripSeparator5.Visible = (Mode != MODE.Scan);
            toolStripSeparator4.Visible = (Mode != MODE.Scan);
            OptionsToolStripMenuItem.Enabled = (Mode != MODE.Scan);

            try
            {
                if ((Mode != MODE.Scan) && (im != null))
                {
	                SetRectShowSize();
                }
                switch (paramCall)
                {
	               case 2:
	               case 3: //by open/close panel for image edit

	               rectScrShow.X = (hScrollBar.Value * delta_default) / delta;
		               break;
               }
            }
            catch { }

            rectDrawReversible = new Rectangle(0, 0, 0, 0);
            SetDrawReversibleSize(new Point(0, 0));
            startPoint = new Point(0, 0);
            SetVisibleDen((Mode != MODE.Scan));
            isDrawLine = false;

            Invalidate();
			Update();
        }

        private void FData_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (!backgroundWorker.CancellationPending)
            {
                backgroundWorker.CancelAsync();
            }
    
            String xmlFileFolder = System.IO.Directory.GetCurrentDirectory() + @"\RMU1Data.xml";
            SerializeObject(xmlFileFolder);
        }

        # region Draw

            private void FData_Paint(object sender, PaintEventArgs e)
            {
                if (device == null)
                {
                    return;
                }
                if ((Mode != MODE.Save) && (Mode != MODE.Open))
                {
                    Draw();
                    rectDrawReversible = new Rectangle(0, 0, 0, 0);
                    SetDrawReversibleSize(new Point(0, 0));
                }
               else
                {
                   device.Clear(ClearFlags.Target, Color.White, 1.0f, 0);
                }
                try
                {
                    device.Present();
                }
                catch(Exception ex)
                {
    //                device.Reset();
                    MessageBox.Show("Error device. " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Exclamation);
                    device = new Device(0, DeviceType.Hardware, this, CreateFlags.SoftwareVertexProcessing, presentParams);
                }
            }

            private void Draw()
            {
                try
                {
     /*          // Проверяем возможность выполнения техники на текущем GPU

                   effect.ValidateTechnique(EffectHandle.FromString("Simplest"));
               // Задаём используемую технику

               effect.Technique = "Simplest";

        */
                 device.BeginScene();
                 if (Mode != MODE.Scan)
                 {
                     DrawImage();
                 }
                back = device.GetBackBuffer(0, 0, BackBufferType.Mono);
                g = back.GetGraphics();
                //          effect.Technique = "Simplest";
                //            int numpasses = effect.Begin(0);
                //            for (int i = 0; i < numpasses; i++)
                {
                    g.Clear(Color.White);
                    //                effect.BeginPass(i);
                    if (im != null)
                    {
                        lock (im)
                        {
                            if (panelColor.Visible == true)
                            {
                               g.DrawImage(im, rectDeskShow, (float)rectScrShow.Left, (float)rectScrShow.Top, (float)rectScrShow.Width, (float)rectScrShow.Height, units, imageAttr);
                            }
                            else
                            {

                                g.DrawImage(im, rectDeskShow, (float)rectScrShow.Left, (float)rectScrShow.Top, (float)rectScrShow.Width, (float)rectScrShow.Height, units);
                                //                            g.DrawImage(bmp[0], (float)rectScrShow.Left, (float)rectScrShow.Top);// rectDeskShow, (float)rectScrShow.Left, (float)rectScrShow.Top, (float)rectScrShow.Width, (float)rectScrShow.Height, units);
                            }
                            if (isDrawLine == true)
                            {
                                g.DrawLine(new Pen(Color.Red), crossSection, new Point(crossSection.X, crossSection.Y + rectDeskShow.Height));
                            }
                        }
                    }
                    //                effect.EndPass();
                }
                //            effect.End();
    /*            sprite.Begin(SpriteFlags.SortTexture | SpriteFlags.AlphaBlend);

                     sprite.Draw(texture, Vector3.Empty, new Vector3(panelDepth.Left,
               panelDepth.Top, 0), Color.White.ToArgb());

                     sprite.End();

                //       UpdateFramerate();
    */
                back.ReleaseGraphics();
                g.Dispose();
                g = null;

                back.Dispose();
                back = null;

                device.EndScene();
               }
               catch (InvalidCallException)
               {
                    MessageBox.Show(String.Format("Не могу найти технику в эффекте "));
               }
               catch (DirectXException)
               {
                    MessageBox.Show(String.Format("Ошибка при валидации техники эффекта "));
               }
            }

            private void DrawImage()
            {
                if ((im == null) && ((bmp != null) && (bmp.Length != 0)))
                {
                    Bitmap bmpTemp = new Bitmap((rectScreen.Width * delta_default) / delta, height_frame_bmp);
                    im = (Image)bmpTemp.Clone();

                }
                if (hScrollBar.Visible)
                {
                    int X = (hScrollBar.Value * 100) / delta;
                    int rem;
                    int item = Math.DivRem(X, itemWidth, out rem);
                    FDataConvertion_DrawImage(item, rem);
                }
                else
                {
                    FDataConvertion_DrawImage(0, 0);
                }
            }

            private void SetRectShowSize()
            {
                lock (im)
                {
                    int height = (im.Height * delta) / delta_default;
                    int width = (im.Width * delta) / delta_default;

                    int offset = (hScrollBar.Location.Y - (height > rectScreen.Height ? rectScreen.Height : height) - rectScreen.Location.Y) / 2;
                    rectDeskShow.Location = new Point(rectScreen.Location.X, rectScreen.Location.Y + offset);
                    rectDeskShow.Size = new Size((width > rectScreen.Width) ? rectScreen.Width : width, (height > rectScreen.Height) ? rectScreen.Height : height);
                    if (Mode == MODE.Scan)
                    {
                        rectScrShow.X = (width > rectScreen.Width) ? (im.Width - ((rectScreen.Width * delta_default) / delta)) : 0;
                        rectScrShow.Y = 0;
                    }
                    else
                    {
                        rectScrShow.X = 0;
                        rectScrShow.Y = (height > rectScreen.Height) ? ((vScrollBar.Value * 100) / delta) : 0;
                    }

                    rectScrShow.Width = (width >= rectScreen.Width) ? ((rectScreen.Width * delta_default) / delta) : im.Width;
                }
                if (Mode == MODE.Scan)
                {
                    Invalidate();
                    Update();
                }
            }

            private int GetBmpWidth()
            {
                int width = 0;
                if ((bmp != null) && (bmp.Length != 0))
                {
                    if (bmp[0] != null)
                    {
                        width = ((bmp.Length - 1) * bmp[0].Width);
                    }
                    int item = bmp.Length;
                    // Add last bmp width
                    while ((bmp[item - 1] != null) && (item != 0))
                    {
                        width += bmp[item - 1].Width;
                    }
                }

                return width;
            }

            private void ChangeValueScroll(double old_Hmax, double old_Hvalue)
            {
               double d = Math.Abs(old_Hvalue * hScrollBar.Maximum / old_Hmax);
               hScrollBar.Value = (int)Math.Round(d, 0);

            }

           private void hScrollBar_Scroll(object sender, EventArgs e)
           {
                if (oldValue != hScrollBar.Value)
                {
                    Debug.WriteLine("hscroll " + hScrollBar.Value.ToString());
                    rectScrShow.X = 0;
                    if (rectDrawReversible.Width != 0)
                    {
                       rectDrawReversible = new Rectangle(0, 0, 0, 0);
                    }
                    if ((oldValue != hScrollBar.Value) && (panelDepth.Visible))
                    {
                       int x = (hScrollBar.Value + (crossSection.X - rectDeskShow.Location.X)) * 100 / delta;// / delta;
                       int rem;
                       int item = Math.DivRem(x, itemWidth, out rem);
                       cnt_paint = PaintGrafDepth(item, rem);
                       panelDepth.Invalidate();
                    }
                    Invalidate();
                    Update();
                    oldValue = hScrollBar.Value;
                }
           }

        #endregion Draw

        #region MouseEvent

            private void FData_MouseDown(object sender, MouseEventArgs e)
            {
                if (Mode != MODE.Scan)
                {
                    if (rectDeskShow.Contains(e.Location))
                    {
                        this.txtBoxSX.Visible = true;
                        if (e.Button == MouseButtons.Left)
                        {
                            isDrag = true;
                            ControlPaint.DrawReversibleFrame(this.RectangleToScreen(rectDrawReversible),
                                this.BackColor, FrameStyle.Thick);
                            Rectangle temp = new Rectangle(rectDeskShow.Location, rectDeskShow.Size);
                            Cursor.Clip = RectangleToScreen(temp); //new Rectangle(rectDeskShow.Location, rectDeskShow.Size);
                            rectDrawReversible = new Rectangle(0, 0, 0, 0);
                            startPoint = new Point(e.X, e.Y);
                        }
                    }
                    else
                    {
                        ControlPaint.DrawReversibleFrame(this.RectangleToScreen(rectDrawReversible),
                        this.BackColor, FrameStyle.Thick);
                        rectDrawReversible = new Rectangle(0, 0, 0, 0);
                        SetDrawReversibleSize(new Point(0, 0));
                    }
                }
            }

            private void FData_MouseMove(object sender, MouseEventArgs e)
            {
                if (isDrag)
                {
                    ControlPaint.DrawReversibleFrame(this.RectangleToScreen(rectDrawReversible),
                          this.BackColor, FrameStyle.Thick);
                    rectDrawReversible = new Rectangle(Math.Min(startPoint.X, e.X), Math.Min(startPoint.Y, e.Y), Math.Abs(startPoint.X - e.X), Math.Abs(startPoint.Y - e.Y));
                    ControlPaint.DrawReversibleFrame(this.RectangleToScreen(rectDrawReversible),
                    this.BackColor, FrameStyle.Thick);
                    SetDrawReversibleSize(e.Location);
                }
            }

            private void FData_MouseUp(object sender, MouseEventArgs e)
            {
                if (isDrag)
                {
                    Cursor.Clip = new Rectangle(0, 0, 0, 0);
                    isDrag = false;
                    SetDrawReversibleSize(e.Location);
                }
                if (isDragging)
                {
                    isDragging = false;
                }
            }

            private void SetDrawReversibleSize(Point endPoint)
            {
                double dx = 1, dy = 1;
                int x = Math.Abs(startPoint.X - endPoint.X);
                dx = (x * 0.26 / delta) * 150 / 4;

                int y = Math.Abs(startPoint.Y - endPoint.Y);
                dy = (y * 0.26 / delta) * 140 / 4;

                UpdateControl(new structInvokeParams(txtBoxSX, true, " X  " + dx.ToString("#.00")));
                UpdateControl(new structInvokeParams(txtBoxSY, true, " Y  " + dy.ToString("#.00")));
            }

            public struct structInvokeParams
            {
                public Control controlInvoke;
                public Boolean visibleControl;
                public String textControl;

                public structInvokeParams(Control nameControl, Boolean visibleControl, String textControl)
                {
                    this.controlInvoke = nameControl;
                    this.visibleControl = visibleControl;
                    this.textControl = textControl;
                }
            }

            private void SetVisibleDen(bool isVisible)
            {
                VisibleControl(new structInvokeParams(txtBoxD, isVisible, txtBoxD.Text));
                VisibleControl(new structInvokeParams(txtBoxSX, isVisible, txtBoxSX.Text));
                VisibleControl(new structInvokeParams(txtBoxSY, isVisible, txtBoxSY.Text));
                VisibleControl(new structInvokeParams(lblD, isVisible, lblD.Text));
                VisibleControl(new structInvokeParams(lblS, isVisible, lblS.Text));
            }

            void UpdateControl(structInvokeParams parameters)
            {
                if (parameters.controlInvoke.InvokeRequired)
                {
                    parameters.controlInvoke.Invoke(new System.Action<structInvokeParams>(UpdateControl), new object[] { parameters });
                }
                else
                {
                    parameters.controlInvoke.Text = parameters.textControl;
                }
            }

            void VisibleControl(structInvokeParams parameters)
            {
                if (parameters.controlInvoke.InvokeRequired)
                {
                    parameters.controlInvoke.Invoke(new System.Action<structInvokeParams>(VisibleControl), new object[] { parameters });
                }
                else
                {
                    parameters.controlInvoke.Visible = parameters.visibleControl;
                }
            }

        #endregion MouseEvent

        #region BitmapInitialize

            private void ReviewBitmapArray()
            {
                if ((bmp != null) && (bmp.Length != 0))
                {
                    int item = 0;
                    while ((bmp[item] != null) && (item != (bmp.Length - 1)))
                    {
                        item++;
                    }

                    if ((item == 0) && (bmp[item] == null))
                    {
                        bmp = null;
                        framesCount = 0;
                        return;
                    }
                    int length = (bmp[item] == null) ? item : bmp.Length;
                    int framesBmpTempCount = length * coefficient;
                        if (framesBmpTempCount < (current_frame + 1))
                        {
                            current_frame = framesBmpTempCount - 1;
                        }
                        if (framesCount > (current_frame + 1))
                        {
                            framesCount = current_frame + 1;
                        }
                        int rem;
                        int itemWidthLastBmp = Math.DivRem(framesCount, coefficient, out rem);
                        if (rem == 0)
                        {
                            rem = coefficient;
                        }

                    if (bmp[item] == null)
                    {
                        // Recreate bitmap array without null bitmap element
                        Bitmap[] bmpTemp = new Bitmap[item];
                        for (int i = 0; i < (item - 1); i++)
                        {
                            if (bmp[i] != null)
                            {
                                bmpTemp[i] = (Bitmap)bmp[i].Clone();
                                bmp[i].Dispose();
                            }
                        }

                        bmpTemp[item - 1] = (Bitmap)bmp[item - 1].Clone(new Rectangle(0, 0, width_frame_bmp * rem, height_frame_bmp), PixelFormat.Format48bppRgb);
                        bmp = new Bitmap[bmpTemp.Length];

                        for (int i = 0; i < bmpTemp.Length; i++)
                        {
                            if (bmpTemp[i] != null)
                            {
                                bmp[i] = (Bitmap)bmpTemp[i].Clone();
                                bmpTemp[i].Dispose();
                            }
                        }
                        bmpTemp = null;
                    }
                    else
                    {
                        // Recreate last bitmap
                        Bitmap bmpItemTemp = (Bitmap)bmp[item].Clone(new Rectangle(0, 0, width_frame_bmp * rem, height_frame_bmp), PixelFormat.Format48bppRgb);
                        bmp[item].Dispose();
                        bmp[item] = (Bitmap)bmpItemTemp.Clone();
                        bmpItemTemp.Dispose();
                    }
                }
            }

            private void DisposeBitmapArray(ref Bitmap[] bmpP)
            {
                if (bmpP != null)
                {
                    lock (bmpP)
                    {
                        for (int item = 0; item < bmpP.Length; item++)
                        {
                            if (bmpP[item] != null)
                            {
                                bmpP[item].Dispose();
                            }
                        }
                        bmpP = null;
                    }
                }
                GC.Collect();
            }

            private void InitializeEditBitmap()
            {
                if ((im != null) && (bmp != null))
                {
                    DisposeBitmapArray(ref bmpClone);
                    DisposeBitmapArray(ref bmpInverse);

                    bmpClone = new Bitmap[bmp.Length];
                    if (bmp[bmp.Length - 1] == null)
                    {
                        return;
                    }
                    itemWidthLast = (Int16)(bmp[bmp.Length - 1].Width);
                    bmpInverse = new Bitmap[bmp.Length];

                    for (int i = 0; i < bmp.Length; i++)
                    {
                        if (i < (bmp.Length - 1))
                        {
                            bmpClone[i] = (Bitmap)bmp[i].Clone();
                        }
                        else
                        {
                            //Last bitmap item has different length
                            bmpClone[i] = (Bitmap)bmp[i].Clone();
                        }
                    }
                }
            }

        #endregion BitmapInitialize

        #region PanelEdit
 
            private void ButtonEdit_Click(object sender, EventArgs e)
            {
                Mode = MODE.Edit;
                if (im != null)
                {
				    ClearScreen(3);
				    ChangingPanelColorVisible();
	                Invalidate();
			        Update();
                }
            }

            private void btnPanelEditClose_Click(object sender, EventArgs e)
            {
                panelColor.Visible = false;
                double oldHMax = hScrollBar.Maximum;
                SetScreenSize(leftScreenHeight);
                ChangeValueScroll(oldHMax, hScrollBar.Value);

                SetRectShowSize(); 

                Mode = MODE.NotActive;
                Update();
                Invalidate();
            }

            private void ChangingPanelColorVisible()
            {
                double oldHMax = hScrollBar.Maximum;
                double oldHValue = hScrollBar.Value;
                ChangeValueScroll(oldHMax, oldHValue);

                SetRectShowSize();
		    }
            
            private void ButtonCleanEdit_Click(object sender, EventArgs e)
            {
                nContrast.Value = 0;
                nBrightness.Value = 10;
                nShift.Value = 1;
                chBxInvert.Checked = false;

                if (panelDepth.Visible)
                {
                    changeWidthPanelDepth(0);
                    int x = (hScrollBar.Value + (crossSection.X - rectDeskShow.Location.X)) * 100 / delta;// / delta;
                    int rem;
                    int item = Math.DivRem(x, itemWidth, out rem);
                
                    cnt_paint = PaintGrafDepth(item, rem);
                    panelDepth.Invalidate();
                }
                Invalidate();
                Update();
            }

        #endregion PanelEdit

        #region PanelDepth

            private void FData_MouseDoubleClick(object sender, MouseEventArgs e)
            {
                if (Mode != MODE.Scan)
                {
                    if ((im != null) && rectDeskShow.Contains(e.Location))
                    {
                        Cursor.Clip = new Rectangle(0, 0, 0, 0);
                        Point t = rectDeskShow.Location;
                        int x = (hScrollBar.Value + (e.X - t.X)) * 100 / delta;// / delta;
                        int y = (vScrollBar.Value + (e.Y - t.Y)) * 100 / delta;// / delta;


                        int rem;
                        int item = Math.DivRem(x, itemWidth, out rem);
                        Color col;
                        lock (im)
                        {
                            col = bmp[item].GetPixel(rem, y);
                        }
                        isDrawLine = false;
                        PanelDepthProperties(e.X);
                        cnt_paint = PaintGrafDepth(item, rem);
                        double d = Convert.ToDouble((col.R));
                        d = (d - 255) * (-1);
                        if (d > 250) d = 250;
                        d /= 50;
                        txtBoxD.Text = d.ToString("#.00");
                        panelDepth.Visible = true;
                        panelDepth.Invalidate();
                        panelDepth.Update();

                    }
                }
            }

            private void PanelDepthProperties(int x)
            {
                panelDepth.Height = rectDeskShow.Height + 6;
                panelDepth.Width = widthPanelDepth;
                scaleDepth.Y = delta / 100.0f;
                scaleDepth.X = 1.0f;//0.25f

                if (isDrawLine)
                {
                    crossSection.X = x;
                    crossSection.Y = rectDeskShow.Top;
                }
                else
                {
                    panelDepth.Location = new Point(x, rectDeskShow.Top - 2);
                    crossSection = new Point(x, rectDeskShow.Top);
               }
            }

            private int PaintGrafDepth(int item, int x)
            {
                int top = 0, i = 0, last_j = 0;
                int width = 0, height = 0, y = 0;
                int nShiftVal = 12;
                int last_color;
                Bitmap bmpDepth = null;
                try
                {
                    Rectangle rect = panelDepth.DisplayRectangle;

                    if (bmp[item].Width >= x)
                    {
                        lock (bmp[item])
                        {
                            last_color = bmp[item].GetPixel(x, 0).R;
                            height = vScrollBar.Visible ? rectScrShow.Height : bmp[item].Height;
                            y = vScrollBar.Visible ? ((((height + rectScrShow.Y) > bmp[item].Height)) ? (bmp[item].Height - height) : rectScrShow.Y) : 0;
                            bmpDepth = (Bitmap)bmp[item].Clone(new Rectangle(x, y, 1, height), PixelFormat.Format48bppRgb);
                        }
                        Rectangle tempRect = new Rectangle(0, 0, 1, height);

                        BitmapData bmData = bmpDepth.LockBits(tempRect,
                                         ImageLockMode.ReadOnly, PixelFormat.Format48bppRgb);
                            int stride = bmData.Stride;
                            System.IntPtr Scan0 = bmData.Scan0;
                            unsafe
                            {
                                byte* p = (byte*)(void*)Scan0;
                                int nOffset = stride - 1;
                                int nWidth = 1;
                                // Determine shift value, because the bit value have to be less the panel width
                                byte* p1 = (byte*)(void*)Scan0;
                                p1 += nOffset * 20;
                                   width = (int)((p[1] << 8) | p[0]);
                                    int    widthRec = (width * widthPanelDepth) >> 12;
                                        if (widthRec > widthPanelDepth)
                                        {
                                           nShiftVal = 13;
                                        }
                                        p1 = null;


                                for (int j = 0; j < height; j++)
                                {
                                    for (int k = 0; k < nWidth; ++k)
                                    {
                                        width = (int)((p[1] << 8) | p[0]);

                                        if ((last_color != width) || (j == height_frame_bmp - 1))
                                        {
                                            rectDepth[i] = new Rectangle(rect.Left + 1, rect.Top + top, (widthPanelDepth - ((width * widthPanelDepth) >> nShiftVal)), (j - last_j));
                                            i++;
                                            top += (j - last_j) * 1;
                                            last_color = width;
                                            last_j = j;
                                        }
                                        ++p;
                                    }
                                    p += nOffset;
                                }
                            }
                            bmpDepth.UnlockBits(bmData);
                        }
                    if (bmpDepth != null)
                    {
                        bmpDepth.Dispose();
                    }
                }
                catch(Exception e)
                {
                    MessageBox.Show("Ошибка при загрузке панели. " + e.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Exclamation);
                }
                return i;
            }

            private void panelDepth_MouseDown(object sender, MouseEventArgs e)
            {
                    if (panelDepth.DisplayRectangle.Contains(e.Location) && (Mode != MODE.Scan))
                    {
                        oldPosPanelDepth = new Point(e.Location.X, e.Location.Y);
                        isDragging = true;
                        isDrawLine = true;
                        int height = rectScreen.Height + SystemInformation.CaptionHeight - panelDepth.Height - ((hScrollBar.Visible == true) ? (hScrollBar.Height - 15) : 0) + 2;
                        Cursor.Clip = new Rectangle(rectScreen.Location.X + e.X, rectScreen.Top + SystemInformation.CaptionHeight + e.Y, rectScreen.Width - panelDepth.Width, ((height <= 0) ? 15 : height));
                    }
            }

            private void panelDepth_MouseMove(object sender, MouseEventArgs e)
            {
                if (isDragging)
                {
                    Point tmp = new Point(panelDepth.Location.X, panelDepth.Location.Y);
                    tmp.X += e.X - oldPosPanelDepth.X;
                    tmp.Y += e.Y - oldPosPanelDepth.Y;
                    panelDepth.Location = tmp;
                }
            }

            private void panelDepth_MouseUp(object sender, MouseEventArgs e)
            {
                if (isDragging)
                {
                    isDragging = false;
                    Cursor.Clip = new Rectangle(0, 0, 0, 0);
                }
            }

            private void panelDepth_Paint(object sender, PaintEventArgs e)
            {
                e.Graphics.ScaleTransform(scaleDepth.X, scaleDepth.Y);
                e.Graphics.FillRectangles(new SolidBrush(Color.Black), rectDepth);
            }

            private void changeWidthPanelDepth(int width)
            {
                panelDepth.Width = widthPanelDepth + width;
            }

            private void buttonOkpDepth_Click(object sender, EventArgs e)
            {
                isDrawLine = false;
                panelDepth.Visible = false;
            }

        #endregion PanelDepth

        #region ConnectionDevice

           // This function is called to try binding with the scan device         
           private void timerConnection_Tick(object sender, EventArgs e)
           {
               pictureBoxConnection.Image = (ConnectionResult == 1) ? (Bitmap)global::RMU1.Properties.Resources.imgConnectionYes.Clone() : (Bitmap)global::RMU1.Properties.Resources.imgConnectionNo.Clone();
               if ((Mode == MODE.Scan) || (connectionCheckProcessing))
               {
                   return;
               }
               Debug.WriteLine("connection device begin");
               connectionCheckProcessing = true;
               StringBuilder serverUri = new StringBuilder(stSerOb.ServerUri);
               delegateConnectionDevice.BeginInvoke(serverUri, connectionDeviceResult, null);
           }

           // This function is called to check a connection of the scan device         
           static private void connectionDeviceResult(IAsyncResult itfAr)
           {
               try
               {
                   System.Runtime.Remoting.Messaging.AsyncResult ar = (System.Runtime.Remoting.Messaging.AsyncResult)itfAr;
                   DelegateConnectionDevice bp = (DelegateConnectionDevice)ar.AsyncDelegate;

                   ConnectionResult = bp.EndInvoke(itfAr);           
               }
               catch (Exception e)
               {
                   Debug.WriteLine("connection device error");
                   ConnectionResult = 0;
                   Mode = MODE.NotActive;
               }
               connectionCheckProcessing = false;
               Debug.WriteLine("connection device end");
           }

        #endregion ConnectionDevice

        private void timer_Tick(object sender, EventArgs e)
        {
            timer.Stop();
            /*           String strMess = "Процесс сканирования не выполняется!\n " +
                            "Возможны следующие причины отказа: \n     1. Не достигнут необходимый динамический диапазон " +
                            "(рентген отсутствует или его уровень недостаточен).\n     2. Температура в одном или нескольких детектирующих блоках ниже допустимого уровня.";
              //
                          MessageBox.Show(strMess, "Ошибка сканирования!", MessageBoxButtons.OK, MessageBoxIcon.Error);

                       backgroundWorker.CancelAsync();
            */
        }
    }
}