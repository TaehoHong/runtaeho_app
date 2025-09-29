import UIKit

class UnityViewController: UIViewController {
    
    private var unityView: UIView?
    
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
    }
    
    private func setupUnityView() {
        // Unity 뷰 설정
        // 실제 Unity 통합 시 UnityFramework의 뷰를 가져와서 추가합니다
        // let unityView = UnityFramework.getInstance()?.appController()?.rootView
        
        // 임시 플레이스홀더 뷰
        let placeholderView = UIView()
        placeholderView.backgroundColor = .darkGray
        
        let label = UILabel()
        label.text = "Unity View"
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        placeholderView.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: placeholderView.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: placeholderView.centerYAnchor)
        ])
        
        self.unityView = placeholderView
        
        guard let unityView = self.unityView else { return }
        
        unityView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(unityView, at: 0)
        
        NSLayoutConstraint.activate([
            unityView.topAnchor.constraint(equalTo: view.topAnchor),
            unityView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            unityView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            unityView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    // MARK: - Unity Control
    
    private func pauseUnity() {
        // Unity 일시정지
        // UnityFramework.getInstance()?.pause(true)
    }
    
    private func resumeUnity() {
        // Unity 재개
        // UnityFramework.getInstance()?.pause(false)
    }
    
    // MARK: - Actions
    
    @objc private func closeButtonTapped() {
        dismiss(animated: true, completion: nil)
    }
    
    // MARK: - Orientation
    
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .all
    }
    
    override var shouldAutorotate: Bool {
        return true
    }
}
