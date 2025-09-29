import UIKit
import UnityFramework

class UnityViewController: UIViewController {
    
    private var unityView: UIView?
    private weak var unityFramework: UnityFramework?
    
    // MARK: - Initialization
    
    init(unityFramework: UnityFramework?) {
        self.unityFramework = unityFramework
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupUnityView()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        resumeUnity()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        pauseUnity()
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        view.backgroundColor = .black
        
        // 닫기 버튼 추가
        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white
        closeButton.addTarget(self, action: #selector(closeButtonTapped), for: .touchUpInside)
        
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(closeButton)
        
        NSLayoutConstraint.activate([
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44)
        ])
        
        // 닫기 버튼을 최상단으로 가져오기
        closeButton.layer.zPosition = 1000
    }
    
    private func setupUnityView() {
        // Unity 뷰 가져오기
        guard let unityFramework = self.unityFramework,
              let unityView = unityFramework.appController()?.rootView else {
            print("[UnityViewController] Failed to get Unity view")
            setupPlaceholderView()
            return
        }
        
        self.unityView = unityView
        
        // Unity 뷰를 현재 뷰 컨트롤러에 추가
        unityView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(unityView, at: 0)
        
        NSLayoutConstraint.activate([
            unityView.topAnchor.constraint(equalTo: view.topAnchor),
            unityView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            unityView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            unityView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func setupPlaceholderView() {
        // Unity 뷰를 가져올 수 없을 때 표시할 플레이스홀더
        let placeholderView = UIView()
        placeholderView.backgroundColor = .darkGray
        
        let label = UILabel()
        label.text = "Unity Framework Not Loaded"
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        placeholderView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: placeholderView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: placeholderView.centerYAnchor)
        ])
        
        self.unityView = placeholderView
        
        placeholderView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(placeholderView, at: 0)
        
        NSLayoutConstraint.activate([
            placeholderView.topAnchor.constraint(equalTo: view.topAnchor),
            placeholderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            placeholderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            placeholderView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    // MARK: - Unity Control
    
    private func pauseUnity() {
        unityFramework?.pause(true)
    }
    
    private func resumeUnity() {
        unityFramework?.pause(false)
        unityFramework?.showUnityWindow()
    }
    
    // MARK: - Actions
    
    @objc private func closeButtonTapped() {
        // Unity 일시정지
        pauseUnity()
        
        // 화면 닫기
        dismiss(animated: true, completion: nil)
    }
    
    // MARK: - Orientation
    
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .all
    }
    
    override var shouldAutorotate: Bool {
        return true
    }
    
    override var prefersStatusBarHidden: Bool {
        return true
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
